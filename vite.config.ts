import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
<<<<<<< HEAD
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
=======
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("@supabase")) {
            return "supabase";
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("react-router") || id.includes("@remix-run")) {
            return "router";
          }

          if (id.includes("@tanstack")) {
            return "query";
          }

          if (id.includes("react-hook-form") || id.includes("zod")) {
            return "forms";
          }

          if (
            id.includes("/react/") ||
            id.includes("\\react\\") ||
            id.includes("/react-dom/") ||
            id.includes("\\react-dom\\") ||
            id.includes("/scheduler/") ||
            id.includes("\\scheduler\\")
          ) {
            return "react-vendor";
          }

          if (id.includes("@radix-ui") || id.includes("lucide-react")) {
            return "ui";
          }
        },
      },
    },
  },
}));
>>>>>>> 4f6246bd598163fcd8e5ae2bb839e40c3e709a65
