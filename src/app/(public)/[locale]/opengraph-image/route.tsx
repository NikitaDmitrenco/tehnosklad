import { ImageResponse } from "next/og";

import { isLocale } from "@/i18n/config";

const size = { width: 1200, height: 630 };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response("Not found", { status: 404 });
  const subtitle =
    locale === "ru" ? "Бытовая техника в Комрате" : "Electrocasnice în Comrat";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 84px",
        background: "#f8f6f1",
        color: "#1c1917",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#facc15",
            fontSize: 46,
            fontWeight: 900,
          }}
        >
          T
        </div>
        <div style={{ fontSize: 42, fontWeight: 900 }}>TEHNOSKLAD</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            maxWidth: 900,
            fontSize: 76,
            lineHeight: 1.05,
            fontWeight: 900,
          }}
        >
          {subtitle}
        </div>
        <div style={{ fontSize: 30, color: "#57534e" }}>
          Catalog în rusă și română · Comrat, Moldova
        </div>
      </div>
      <div
        style={{
          width: 320,
          height: 12,
          borderRadius: 999,
          background: "#facc15",
        }}
      />
    </div>,
    size,
  );
}
