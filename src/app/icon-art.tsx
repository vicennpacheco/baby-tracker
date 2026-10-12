import type { ReactNode } from "react";

// Placeholder app icon (decision 072): a neutral mark until there is a real
// logo. Drawn for next/og, which cannot read the CSS tokens, so the colors
// are literal; they mirror the dark --background and --foreground.
const BACKGROUND = "#0a0a0a";
const MARK = "#fafafa";

type IconArtProps = {
  /** Square side in pixels. */
  size: number;
  /**
   * Share of the side the mark may use: Android masks "maskable" icons to a
   * circle, so their mark stays inside the central 80% safe zone.
   */
  markRatio: number;
};

/** A ring with a dot: soft and neutral, legible at 48 px and at 512. */
export function IconArt({ size, markRatio }: IconArtProps): ReactNode {
  const mark = size * markRatio;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BACKGROUND,
      }}
    >
      <div
        style={{
          width: mark,
          height: mark,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: `${Math.round(mark * 0.12)}px solid ${MARK}`,
        }}
      >
        <div
          style={{
            width: mark * 0.28,
            height: mark * 0.28,
            borderRadius: "50%",
            background: MARK,
          }}
        />
      </div>
    </div>
  );
}
