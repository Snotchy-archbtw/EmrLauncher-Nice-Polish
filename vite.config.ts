import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  optimizeDeps: {
    entries: ['index.html'], 
    exclude: ['bin', 'game', 'src-tauri'] 
  },
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**", "**/bin/**", "**/game/**", "**/*.app/**"], 
    }
  },
});