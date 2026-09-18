import { ImageResponse } from "next/og";

const NAVY = "#0B2341";
const BULB = "#F4D35E";
const NECK = "#E8C547";
const BASE = "#E45C8A";

export function brandIconImage(size: number) {
  const s = size / 32;

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
          borderRadius: Math.round(8 * s),
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: Math.round(14 * s),
              height: Math.round(14 * s),
              borderRadius: 999,
              background: BULB,
            }}
          />
          <div
            style={{
              width: Math.round(8 * s),
              height: Math.round(4 * s),
              marginTop: Math.max(1, Math.round(s)),
              borderRadius: Math.max(1, Math.round(s)),
              background: NECK,
            }}
          />
          <div
            style={{
              width: Math.round(10 * s),
              height: Math.round(3 * s),
              marginTop: Math.max(1, Math.round(s)),
              borderRadius: Math.max(1, Math.round(s)),
              background: BASE,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
