// vite.config.ts
import tailwindcss from "file:///tmp/simple-week/node_modules/.pnpm/@tailwindcss+vite@4.1.14_vite@5.4.20_@types+node@20.19.30_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
import react from "file:///tmp/simple-week/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.20_@types+node@20.19.30_lightningcss@1.30.1_/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "file:///tmp/simple-week/node_modules/.pnpm/vite@5.4.20_@types+node@20.19.30_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
var __vite_injected_original_import_meta_url = "file:///tmp/simple-week/vite.config.ts";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared")
    }
  },
  envDir: path.resolve(__dirname),
  publicDir: path.resolve(__dirname, "public"),
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true
  },
  server: {
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvdG1wL3NpbXBsZS13ZWVrXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvdG1wL3NpbXBsZS13ZWVrL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy90bXAvc2ltcGxlLXdlZWsvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgdGFpbHdpbmRjc3MgZnJvbSBcIkB0YWlsd2luZGNzcy92aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwibm9kZTpwYXRoXCI7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSBcIm5vZGU6dXJsXCI7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tIFwidml0ZVwiO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwic3JjXCIpLFxuICAgICAgXCJAc2hhcmVkXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwic2hhcmVkXCIpLFxuICAgIH0sXG4gIH0sXG4gIGVudkRpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSksXG4gIHB1YmxpY0RpcjogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgXCJwdWJsaWNcIiksXG4gIGJ1aWxkOiB7XG4gICAgb3V0RGlyOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCBcImRpc3QvY2xpZW50XCIpLFxuICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICB9LFxuICBzZXJ2ZXI6IHtcbiAgICBob3N0OiB0cnVlLFxuICAgIHByb3h5OiB7XG4gICAgICBcIi9hcGlcIjoge1xuICAgICAgICB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAwXCIsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFrTyxPQUFPLGlCQUFpQjtBQUMxUCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsb0JBQW9CO0FBSjJHLElBQU0sMkNBQTJDO0FBTXpMLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxLQUFLLFFBQVEsVUFBVTtBQUV6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUFBLEVBQ2hDLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsS0FBSztBQUFBLE1BQ2xDLFdBQVcsS0FBSyxRQUFRLFdBQVcsUUFBUTtBQUFBLElBQzdDO0FBQUEsRUFDRjtBQUFBLEVBQ0EsUUFBUSxLQUFLLFFBQVEsU0FBUztBQUFBLEVBQzlCLFdBQVcsS0FBSyxRQUFRLFdBQVcsUUFBUTtBQUFBLEVBQzNDLE9BQU87QUFBQSxJQUNMLFFBQVEsS0FBSyxRQUFRLFdBQVcsYUFBYTtBQUFBLElBQzdDLGFBQWE7QUFBQSxFQUNmO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsUUFDTixRQUFRO0FBQUEsUUFDUixjQUFjO0FBQUEsTUFDaEI7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
