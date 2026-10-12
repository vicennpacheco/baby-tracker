import { ImageResponse } from "next/og";

import { IconArt } from "@/app/icon-art";

// iOS home screen icon (decision 072). iOS rounds the corners itself and
// ignores transparency, so the square is full bleed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon(): ImageResponse {
  return new ImageResponse(<IconArt size={size.width} markRatio={0.6} />, {
    ...size,
  });
}
