# block-world · 方块世界

90 年代方块掌机（俄罗斯方块机）怀旧项目。

## 内容

- **调研报告**：俄罗斯方块（含掌机系列、X 十字/穿缝变种）、掌机拳击游戏调研
- **拳击复刻原型**：[`prototype/boxer/v1/`](prototype/boxer/v1/index.html) —— 俯视视角 6 格方块拳击手、可移动、命中判定、A/D 左右拳，浏览器直接打开 `index.html` 即可玩
- **俄罗斯方块**：[`games/tetris/`](games/tetris/) —— React + TypeScript 正式工程。V2 已实现现代经典规则：7-bag 发牌、Next 预览、Hold 暂存、Ghost 幽灵块、SRS 踢墙旋转、锁定延迟、消行动画与 T-Spin（步骤见[《俄罗斯方块复刻开发步骤》](俄罗斯方块复刻开发步骤.md)）
- **在线玩**：GitHub Pages → https://soapgu.github.io/block-world/

## 目录

```
games/           正式游戏工程（tetris：Vite + React + TS）
prototype/       拳击复刻原型（boxer/v1、v2、v3 各版本独立存储）
course/          少儿编程课讲解、练习题与配图
*.md             调研报告与设计方案
index.html       首页（GitHub Pages）
```

## 开发

```bash
cd games/tetris
npm install
npm run dev      # 本地开发
npm run build    # 构建，产物在 games/tetris/dist/
```

推送到 main 后由 GitHub Actions 自动构建并部署整站（含静态页面与游戏产物），workflow 见 [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)。
