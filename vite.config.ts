import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/defend-yumi/',
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
});
