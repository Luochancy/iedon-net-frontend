# IEDON-NET Frontend

DN42 IEDON 网络前端管理界面 — 自动对等连接、Looking Glass、会话管理与节点监控。

## 构建

```bash
npm install
npm run build
# 构建产物位于 ./dist
# 部署前修改 ./src/config.ts 中的 API 地址
```

## 功能

- 自动对等连接申请与管理
- Looking Glass（BIRD 协议/路由查看）
- 多节点会话监控与指标
- 多语言支持（中/英/日/韩/繁）

## 技术栈

- Vue 3 + Vite + TypeScript
- Vuetify 3
- vue-i18n
- ECharts

## 许可证

GPL-3.0

Based on [iedon/iedon-net-frontend](https://github.com/iedon/iedon-net-frontend), substantially rewritten.
