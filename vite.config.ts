import tailwindcss from "@tailwindcss/vite";
import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Libraries change rarely: separate files stay in the browser cache across deployments.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          i18n: ["i18next", "react-i18next"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "sonner"],
        },
      },
    },
  },
  server: {
    // The API (server/) runs on :3000 in development — see README.
    proxy: {
      "/api": "http://localhost:3000",
      "/uploads": "http://localhost:3000",
    },
  },
});
