import asyncio
from io import BytesIO
from pathlib import Path
from sys import stderr, platform
from PIL import Image, ImageChops
from bleak import BleakScanner, BleakClient
from typing import List, TYPE_CHECKING
from dymo_bluetooth.printer import Canvas, Result, command_print

if TYPE_CHECKING:
    from bleak.backends.device import BLEDevice
    from bleak.backends.characteristic import BleakGATTCharacteristic


SERVICE_UUID = "be3dd650-{uuid}-42f1-99c1-f0f749dd0678".format(uuid = "2b3d")
PRINT_REQUEST_UUID = "be3dd651-{uuid}-42f1-99c1-f0f749dd0678".format(uuid = "2b3d")
PRINT_REPLY_UUID = "be3dd652-{uuid}-42f1-99c1-f0f749dd0678".format(uuid = "2b3d")

# Not used in the actual vendor app.
UNKNOWN_UUID = "be3dd653-{uuid}-42f1-99c1-f0f749dd0678".format(uuid = "2b3d")


def is_espressif(input_mac: str):
    """
    Returns True if given MAC address is from Espressif Inc.
    """
    mac_blocks = [
        "58:CF:79",
        "DC:54:75", # confirmed in #2
        "34:85:18", # confirmed in #4
    ]
    check_mac = int(input_mac.replace(":", ""), base = 16)
    for mac in mac_blocks:
        start_block = int(mac.replace(":", ""), base = 16) << 24
        end_block = start_block + (1 << 24) # Exclusive
        if (check_mac >= start_block) and (check_mac < end_block):
            return True
    return False


class Printer:
    def __init__(self, impl: "BLEDevice") -> None:
        self._impl = impl
        self._client = BleakClient(self._impl)

    @classmethod
    def from_address(cls, address: str) -> "Printer":
        """
        Constructs a Printer directly from a Bluetooth address (or, on macOS, a
        CoreBluetooth peripheral UUID) without a prior scan. Useful for reconnecting
        to a printer that was paired in a previous session.
        """
        self = cls.__new__(cls)
        self._impl = address
        self._client = BleakClient(address)
        return self

    @property
    def address(self) -> str:
        """The Bluetooth address (or CoreBluetooth UUID) of this printer."""
        impl = self._impl
        return impl if isinstance(impl, str) else impl.address

    @property
    def is_connected(self) -> bool:
        return self._client.is_connected

    async def connect(self):
        if self._client.is_connected:
            return
        await self._client.connect()
    
    async def disconnect(self):
        if not self._client.is_connected:
            return
        await self._client.disconnect()

    async def print(self, canvas: Canvas, on_progress = None):
        """
        Prints the given canvas. If `on_progress` is supplied, it is called as
        `on_progress(sent, total)` after each GATT write so callers can surface a
        progress bar (`sent` counts the header + every chunk).
        """
        if not self._client.is_connected:
            raise Exception("Printer is not connected!")
        print_request: "BleakGATTCharacteristic" = self._client.services.get_characteristic(PRINT_REQUEST_UUID) # type: ignore # noqa: E501
        print_reply: "BleakGATTCharacteristic" = self._client.services.get_characteristic(PRINT_REPLY_UUID) # type: ignore # noqa: E501
        future: asyncio.Future[Result] = asyncio.Future()
        should_discard: bool = False
        # Printer sends two messages, first is the PRINTING, and second one is the
        # printing result. So we discard the first message.
        async def reply_get(_, data: bytearray): # noqa: E501
            nonlocal should_discard
            result = Result.from_bytes(data)
            if (not should_discard) and (result.value in [0, 1]):
                should_discard = True
                return
            # This is the second reply, which holds the actual status code.
            if not future.done():
                future.set_result(result)
        await self._client.start_notify(print_reply, reply_get)
        chunks = list(command_print(canvas))
        total = len(chunks)
        for index, chunk in enumerate(chunks, start = 1):
            await self._client.write_gatt_char(print_request, chunk, True)
            if on_progress is not None:
                on_progress(index, total)
        return await future


async def discover_printers(max_timeout: int = 5, ensure_mac: bool = False) -> List[Printer]:
    """
    Searches for printers nearby and returns a list of Printer objects. If no printer
    has found in the initial search, waits for scanning until the max timeout has been 
    reached.
    """
    printers: List[Printer] = []
    waited_total = 0
    async with BleakScanner(service_uuids = [SERVICE_UUID]) as scanner:
        while True:
            # TODO: In some cases, advetisement data may be non-null, containing
            # additional metadata about printer state but it is not implemented yet.
            for device, _ in scanner.discovered_devices_and_advertisement_data.values():
                has_valid_name = (device.name or "").startswith("Letratag")
                if (platform != "darwin") and has_valid_name:
                    has_valid_name = (device.name or "").endswith(device.address.replace(':', ''))
                if not has_valid_name:
                    continue
                if ensure_mac and (not is_espressif(device.address)):
                    print(
                        f"A possible printer is found, but its MAC {device.address} isn't whitelisted, " +
                        "thus ignored. If it isn't right, either disable MAC checking or open a issue.",
                        file = stderr
                    )
                    continue
                printers.append(Printer(device))
            # Do we have any candidate printers? If so, return the found printers. 
            # Otherwise, wait for the next scans until we found any.
            if printers:
                break
            elif waited_total >= max_timeout:
                return []
            await asyncio.sleep(0.5)
            waited_total += 0.5
    return printers


def convert_image_to_canvas(
    image: Image.Image, 
    dither: bool = True,
    trim: bool = False
):
    """
    Converts an Pillow Image to a Canvas object.
    """
    output = image.convert("1", dither = \
        Image.Dither.FLOYDSTEINBERG if dither else Image.Dither.NONE
    )
    # If trim is enabled, discard trailing and leading blank lines.
    if trim:
        mask = Image.new("1", output.size, color = 255)
        diff = ImageChops.difference(output, mask)
        output = output.crop(diff.getbbox(alpha_only = False))
    # Convert image to pixel array.
    canvas = Canvas()
    # Shrink the image from the center if it exceeds the print height,
    # or max printable width.
    if (output.height > canvas.height):
        start_y = int(output.height / 2) - int(canvas.height / 2)
        output = output.crop(
            (0, start_y, output.width, start_y + canvas.height)
        )
    for w in range(output.width):
        for h in range(output.height):
            pixel = output.getpixel((w, h, ))
            canvas.set_pixel(w, h, not pixel)
    return canvas


def create_image(path: Path, dither: bool = True):
    """
    Converts an image file in given path to Canvas.
    """
    buffer = BytesIO()
    with path.open("rb") as op:
        buffer.write(op.read())
    buffer.seek(0)
    image = Image.open(buffer)
    return convert_image_to_canvas(image, dither)


def create_code_128(text: str):
    """
    Creates a Code 128 barcode and dumps to Canvas.
    """
    try:
        from barcode import Code128 # type: ignore
        from barcode.writer import ImageWriter # type: ignore
    except ModuleNotFoundError:
        raise Exception("This method requires 'python-barcode' to be installed.")
    imwrite = ImageWriter()
    imwrite.dpi = 200
    code = Code128(text, writer = imwrite)
    return convert_image_to_canvas(code.render(text = ""), dither = False, trim = True)
