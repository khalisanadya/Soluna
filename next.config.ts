import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  experimental: {
    agentFeedback: true,
    // Aplikasi terautentikasi: hampir semua halaman membaca sesi + basis data per permintaan.
    // Validasi instant hanya untuk segmen yang menyatakan `instant` secara eksplisit.
    // PSK-8: unggah foto dan dokumen baterai lewat Server Action (maks. 4 MB per berkas).
    serverActions: {
      bodySizeLimit: "10mb",
    },
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
