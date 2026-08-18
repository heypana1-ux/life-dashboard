import { ImageResponse } from "next/og";

export const dynamic = "force-static";
const SIZE = 512;

/** App icon (512×512, full-bleed so it works as a maskable icon too). */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4f46e5, #7c7bff)",
        }}
      >
        <svg width={SIZE * 0.56} height={SIZE * 0.56} viewBox="0 0 64 64">
          <path d="M32 10l4.6 12.8L50 28l-13.4 4.2L32 46l-4.6-13.8L14 28l13.4-5.2z" fill="#ffffff" />
          <circle cx="48" cy="46" r="4.5" fill="#ffffff" />
          <circle cx="18" cy="48" r="3.5" fill="#ffffff" />
        </svg>
      </div>
    ),
    { width: SIZE, height: SIZE },
  );
}
