import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `npm run dev`, calls to /signup, /login, /me and /api/* are proxied
// to your FastAPI backend so you don't hit CORS issues locally.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8000",
      "/login": "http://localhost:8000",
      "/signup": "http://localhost:8000",
      "/me": "http://localhost:8000",
    },
  },
});
