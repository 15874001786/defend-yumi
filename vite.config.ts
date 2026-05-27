import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: process.env.VITE_BASE_PATH ?? (command === 'build' ? '/defend-yumi/dist/' : '/'),
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
}));
