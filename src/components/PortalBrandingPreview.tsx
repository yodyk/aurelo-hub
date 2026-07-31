/**
 * Live preview of how the client portal header/branding renders with the
 * workspace's current settings. Purely presentational — no data fetching.
 */
import { AureloLogo } from "@/components/AureloLogo";

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

  return (
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
