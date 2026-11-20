import { glyphInner, type GlyphName } from "./ui/Glyph.tsx";

/** Shared read-only overlay geometry consumed by the focused M5 chart. */
export interface CChartZone {
  role: string;
  lo: number;
  hi: number;
  label: string;
  color: string;
  glyph?: GlyphName;
  showLabel?: boolean;
}

export interface CChartLine {
  price: number;
  label: string;
  color: string;
  dash?: boolean;
  glyph?: GlyphName;
}

/** Draw a house glyph inside an SVG at the requested pixel size. */
export function ChartGlyph({ name, gx, gy, gs, color }: { name: GlyphName; gx: number; gy: number; gs: number; color: string }) {
  const sc = gs / 24;
  return <g transform={`translate(${gx},${gy}) scale(${sc})`} fill="none" stroke={color} color={color}
    strokeWidth={1.75 / sc} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: glyphInner(name) }} />;
}
