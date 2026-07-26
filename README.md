# 柳味探秘 · iOS App

React Native (Expo 52) iOS 端，与 web 端 UI/feature parity。

## 快速开始

```bash
npm install
npx expo run:ios
```

## 技术栈

- **容器**: React Native (Expo 52)
- **JS**: React 18.3.1
- **构建**: Xcode + `npx expo run:ios`
- **后端**: Flask on `8.135.58.90:8601`
- **Bundle ID**: `com.lanx.snailbooks`

## 项目结构

```
src/
├── screens/      # 页面
├── components/   # 公共组件
├── navigation/   # 路由
├── hooks/        # 自定义 hooks
├── utils/        # 工具函数
├── api/          # API 客户端
├── i18n.tsx      # 国际化（zh-CN / zh-TW / en）
├── theme.tsx     # 三套主题 + FONTS 字号系统
└── sharedStyles.ts # 公共 UI 常量
```

## 开发规范

详见 [DEVELOPMENT.md](./DEVELOPMENT.md)，包含：
- 目录结构与命名规范
- 共享常量说明（圆角、Switch 配色、FONTS 字号等）
- web → iOS 同步策略
- 构建与调试指南
