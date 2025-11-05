import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5000,
    open: true,
    proxy: {
      // ✅ API 요청을 Express(8080)으로 프록시
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // ✅ 이미지 및 정적 파일 프록시
      "/tools": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
      // ✅ 임시 이미지 프록시 추가
      "/temp": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
