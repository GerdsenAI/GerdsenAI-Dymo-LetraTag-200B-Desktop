// Lucide icon helper — the design uses Lucide for all UI chrome icons.
// (The printable glyphs ★♥✓→ … are label *content*, not icons; see data.ts.)

import {
  Settings,
  X,
  Check,
  TriangleAlert,
  Printer,
  IdCard,
  Folder,
  Plug,
  Archive,
  Calendar,
  Mail,
  Barcode,
  Minus,
  Square,
  Copy,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  settings: Settings,
  x: X,
  check: Check,
  "triangle-alert": TriangleAlert,
  printer: Printer,
  "id-card": IdCard,
  folder: Folder,
  plug: Plug,
  archive: Archive,
  calendar: Calendar,
  mail: Mail,
  barcode: Barcode,
  // window controls
  minimize: Minus,
  maximize: Square,
  restore: Copy,
};

export function Icon({
  name,
  size = 16,
  color = "currentColor",
  strokeWidth = 2,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Cmp = ICON_MAP[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} style={{ display: "block", flexShrink: 0 }} />;
}
