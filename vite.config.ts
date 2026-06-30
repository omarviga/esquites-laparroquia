import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const stubTs = path.resolve(__dirname, "./src/stubs/router-entry.ts");

export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  plugins: [
    tailwindcss(),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "#tanstack-router-entry": stubTs,
      "#tanstack-start-entry": stubTs,
      "tanstack-start-manifest:v": stubTs,
    },
  },
  build: {
    rollupOptions: {
      external: (id) => {
        if (id.startsWith("#tanstack-") || id.startsWith("tanstack-start-manifest:")) return true;
        if (id.startsWith("node:")) return true;
        return false;
      },
    },
  },
});
