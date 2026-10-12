import type { MetadataRoute } from "next";

// The web app manifest (decision 072), served at /manifest.webmanifest.
// Colors are literal (the manifest cannot read CSS tokens): they mirror the
// light --background, like the viewport's themeColor in the root layout.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Métricas Bebé",
    short_name: "Métricas Bebé",
    description:
      "Registro rápido de tomas, pañales, sueño, crecimiento y salud del bebé.",
    lang: "es",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
