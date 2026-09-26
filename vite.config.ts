import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' 使构建产物可直接部署到 GitHub Pages 等任意子路径
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
