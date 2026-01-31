import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default ({ mode }) => {
  // Load env vars
  const env = loadEnv(mode, process.cwd(), '')

  // Parse allowed hosts from comma-separated string
  const allowedHosts = env.VITE_ALLOWED_HOSTS.split(',');

return defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
    allowedHosts: [
      allowedHosts
    ]
  },
})}