import { ImageResponse } from "next/og";

import { IconArt } from "@/app/icon-art";

// The PWA icons the manifest lists (decision 072): 192 and 512 for the
// launcher and the splash screen, plus a maskable 512 for Android's shapes.
// Served at /icon/<id>; static, so they are generated at build time.
const ICONS = [
  { id: "192", size: 192, markRatio: 0.6 },
  { id: "512", size: 512, markRatio: 0.6 },
  { id: "maskable", size: 512, markRatio: 0.48 },
] as const;

export function generateImageMetadata(): {
  id: string;
  size: { width: number; height: number };
  contentType: string;
}[] {
  return ICONS.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({
  id,
}: {
  id: Promise<string | number>;
}): Promise<ImageResponse> {
  const iconId = String(await id);
  const icon = ICONS.find((candidate) => candidate.id === iconId) ?? ICONS[0];
  return new ImageResponse(
    <IconArt size={icon.size} markRatio={icon.markRatio} />,
    { width: icon.size, height: icon.size },
  );
}
