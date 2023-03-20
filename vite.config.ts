import fs from 'fs';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const hostConfig = {
  host: 'dominion.id',
  port: 3005,
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    ...hostConfig,
    https: {
      key: fs.readFileSync('./dominion-id.key'),
      cert: fs.readFileSync('./dominion-id.crt'),
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
});
