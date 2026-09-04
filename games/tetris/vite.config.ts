import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // 相对路径：无论部署在哪个子目录（本项目为 /block-world/games/tetris/），
  // 产物内资源引用都能正确解析
  base: './',
  plugins: [react()],
})
