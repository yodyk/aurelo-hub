/**
 * Live preview of how the client portal header/branding renders with the
 * workspace's current settings. Purely presentational — no data fetching.
 */
import { AureloLogo } from "@/components/AureloLogo";
import { AlertTriangle } from "lucide-react";

/** Parse #rgb / #rrggbb into [r,g,b] 0-255. Returns null when unparseable. */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relLuminance([r, g, b]: [number, number, number]) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrastRatio(a: string, b: string): number | null {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return null;
  const la = relLuminance(ca);
  const lb = relLuminance(cb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function PortalBrandingPreview({
  brandColor,
  businessName,
  logoUrl,
  isWhiteLabel = true,
}: {
  brandColor: string;
  businessName: string;
  logoUrl?: string | null;
  isWhiteLabel?: boolean;
}) {
  const accent = (isWhiteLabel && brandColor) || "#3B66F0";

  // White button/badge text sits on the accent; accent text sits on white surfaces.
  const onAccent = contrastRatio(accent, "#ffffff");
  const accentOnWhite = onAccent; // same pair, both directions
  const buttonFails = onAccent !== null && onAccent < 4.5;
  const textFails = accentOnWhite !== null && accentOnWhite < 4.5;
  const showWarning = buttonFails || textFails;
  const ratioLabel = onAccent ? onAccent.toFixed(2) : null;

  return (
    <div className="space-y-2">
    <div
      className="overflow-hidden border rounded"

      style={{
        borderColor: "#e7e8ec",
        backgroundColor: "#f7f7f9",
        color: "#0f1115",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ backgroundColor: "#ffffff", borderColor: "#e7e8ec" }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {isWhiteLabel ? (
            <>
              {logoUrl && (
                <img src={logoUrl} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0" />
              )}
              {businessName ? (
                <span className="text-[13px] font-semibold tracking-[-0.01em] truncate">{businessName}</span>
              ) : (
                !logoUrl && <AureloLogo className="h-4" />
              )}
            </>
          ) : (
            <AureloLogo className="h-4" />
          )}
        </div>
        <span
          className="text-[9.5px] font-semibold tracking-wide uppercase px-2 py-1 rounded"
          style={{ backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent }}
        >
          Client Portal
        </span>
      </div>

      {/* Body mock */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-1.5">
          {["Overview", "Retainer", "Invoices"].map((t, i) => (
            <span
              key={t}
              className="text-[11px] px-2.5 py-1 rounded"
              style={
                i === 0
                  ? { backgroundColor: accent, color: "#fff", fontWeight: 600 }
                  : { color: "#6b7280" }
              }
            >
              {t}
            </span>
          ))}
        </div>

        <div className="rounded border p-3 space-y-2" style={{ backgroundColor: "#fff", borderColor: "#e7e8ec" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold" style={{ color: accent }}>Retainer</span>
            <span className="text-[11px]" style={{ color: "#6b7280" }}>12.5 / 20 hrs</span>
          </div>
          <div className="h-1.5 w-full rounded overflow-hidden" style={{ backgroundColor: "#f1f2f5" }}>
            <div className="h-full rounded" style={{ width: "62%", backgroundColor: accent }} />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span
              className="text-[10.5px] px-2 py-1 rounded"
              style={{ backgroundColor: accent, color: "#fff", fontWeight: 600 }}
            >
              Pay invoice
            </span>
            <span className="text-[10.5px]" style={{ color: accent, fontWeight: 500 }}>View details</span>
          </div>
        </div>

        {!isWhiteLabel && (
          <p className="text-[10px] text-center pt-1" style={{ color: "#9ca3af" }}>
            Powered by Aurelo
          </p>
        )}
      </div>
    </div>
  );
}

export default PortalBrandingPreview;
