import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: './', // 相対パスを使用
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