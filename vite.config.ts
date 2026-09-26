import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' 使构建产物可直接部署到 GitHub Pages 等任意子路径
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
    // UI 冒烟测试需要 DOM
    environmentMatchGlobs: [['tests/ui/**', 'jsdom']],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      // 覆盖率目前仅作报告（本地输出通道不可靠，阈值待 CI 实测基线后再设定）
      include: ['src/lib/**'],
    },
  },
});
