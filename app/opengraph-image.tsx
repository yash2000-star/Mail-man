import { ImageResponse } from "next/og";

export const alt = "Mail-man: AI email client for Gmail";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when a Mail-man link is shared. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(circle at 80% 20%, #451a03 0%, #000 55%)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, color: "#f59e0b", fontSize: 36, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 64, height: 64, borderRadius: 14, border: "4px solid #f59e0b", alignItems: "center", justifyContent: "center" }}>
            M
          </div>
          Mail-man
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          Your inbox, sorted by AI.
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 32, color: "#a1a1aa", maxWidth: 900 }}>
          Summaries, suggested replies, Smart Labels and to-dos for Gmail, with your own Gemini, ChatGPT or Claude key.
        </div>
      </div>
    ),
    size,
  );
}
