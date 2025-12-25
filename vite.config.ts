import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Load server config to match port
let serverPort = 3001;
try {
  const configPath = path.resolve(__dirname, 'server/config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (config.port) serverPort = config.port;
  }
} catch (e) {
  console.warn("Could not load server/config.json for proxy setup, defaulting to 3001");
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${serverPort}`,
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
