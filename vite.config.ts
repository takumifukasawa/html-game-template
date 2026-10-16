import { defineConfig } from 'vite'
import path from 'path'
import { tuningPlugin } from './tools/tuning/vite-plugin-tuning'

export default defineConfig({
  base: './', // 相対パスを使用
  plugins: [
    // Files the dev-only tuning panel may write back to (docs/TEMPLATE.md「調整パネル」).
    tuningPlugin({ files: [{ file: 'src/scripts/app/GameConfig.ts', exportName: 'GameConfig' }] }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.')
    }
  },
  server: {
    middlewareMode: false,
    fs: {
      allow: ['..']
    }
  },
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@babylonjs/havok']
  }
})