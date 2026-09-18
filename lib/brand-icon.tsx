import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const NAVY = "#0B2341";

function logoDataUrl() {
  const png = readFileSync(join(process.cwd(), "public/rjl-logo-mark.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

export function brandIconImage(size: number) {
  const inset = Math.max(0, Math.round(size * 0.04));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: NAVY,
        }}
      >
        <img
          src={logoDataUrl()}
          alt=""
          width={size - inset * 2}
          height={size - inset * 2}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
