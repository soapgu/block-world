import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 相对路径：部署在 /block-world/games/snake/ 二级子路径下，
// 资源引用必须相对解析（tetris 实测教训：写 '/block-world/' 会 404）
export default defineConfig({
  base: './',
  plugins: [react()],
})
