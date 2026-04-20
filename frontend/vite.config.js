import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const certDir = path.resolve(__dirname, "../backend/certs");
const keyPath = path.join(certDir, "key.pem");
const certPath = path.join(certDir, "cert.pem");
const httpsEnabled =
  process.env.HTTPS === "1" && fs.existsSync(keyPath) && fs.existsSync(certPath);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    https: httpsEnabled
      ? { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) }
      : false,
    proxy: {
      "/api": {
        target: httpsEnabled ? "https://localhost:4000" : "http://localhost:4000",
        changeOrigin: true,
        secure: false,
      },
      "/socket.io": {
        target: httpsEnabled ? "https://localhost:4000" : "http://localhost:4000",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
