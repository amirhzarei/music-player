import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true
  },
  server: {
    port: 5173,
    open: true
  },
  preview: {
    port: 4173
  }
});