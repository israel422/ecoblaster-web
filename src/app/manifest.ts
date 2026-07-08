import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EcoBlaster",
    short_name: "EcoBlaster",
    description: "Registro de escavações — Ecoelétrica Engenharia",
    start_url: "/",
    display: "standalone",
    background_color: "#F0F4F8",
    theme_color: "#1B4FA2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
