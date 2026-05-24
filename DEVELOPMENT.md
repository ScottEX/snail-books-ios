# 蓝姐螺蛳粉 · iOS App 开发规范

## 技术栈
- **容器**: Capacitor（WKWebView）
- **前端**: 纯 SPA（无 Jinja2），复用 Web 端 Tailwind CDN
- **认证**: Bearer token（WKWebView 丢弃跨域 cookie）
- **热更新**: FRONTEND_VERSION + `/api/frontend.zip` 分发
- **构建**: Xcode + `npx cap copy ios`
- **Bundle ID**: `com.lanx.snailbooks`

## 构建流程

### 修改 www/ 后的部署（每次必须全做）
```bash
cd /Users/lanx/projects/snail-books-ios
npx cap copy ios                          # 1. 复制 www/ → ios/App/App/public/
cd ios/App && xcodebuild ... build        # 2. 构建到 DerivedData
xcrun simctl terminate booted com.lanx.snailbooks
sleep 1
xcrun simctl install booted <app路径>      # 3. 安装
xcrun simctl launch booted com.lanx.snailbooks
```

> `npx cap copy` 只复制到项目目录，模拟器读的是 DerivedData bundle，必须 rebuild。

### 一键构建
```bash
bash scripts/build.sh   # 图标生成 + Xcode 构建 + 安装到模拟器
```

## 关键陷阱

### 键盘
- **iOS 模拟器：先按 ⌘K！** 硬件键盘连接时软键盘不显示
- 2026.5 因此浪费 2h+ 调试

### WKWebView 认证
- WKWebView 会丢弃跨域 `Set-Cookie`
- 必须用 Bearer Token 替代 session cookie
- 登录后存 `token` 到 localStorage，请求带 `Authorization: Bearer <token>`

### capacitor.config.json
- 不要配 `"server": {"url": "http://192.168.x.x:9876"}`（dev server 没跑就白屏）
- 离线模式：`{"server": {"cleartext": true}}`

### Tailwind `hidden` class
- **iOS App 中绝对不要用 `hidden`**（`display: none !important` 覆盖 JS `style.display`）
- 统一用 `.page-hidden` 自定义 class + 内联 `style="display:none"` + JS `style.display` 切换
- 这是导致白屏和 logo 被遮挡的根本原因

### 安全区域
- iOS 刘海/灵动岛需要 `env(safe-area-inset-top)`
- 不要只依赖 Tailwind `pt-N`，用 `calc` 叠加：
```html
<div style="padding-top:calc(env(safe-area-inset-top, 24px) + 16px)">...</div>
```

## 样式一致性

- **必须使用和 Web 端完全相同的 Tailwind CDN + Google Fonts**
- 不手写独立 CSS（否则样式漂移，用户能看出来）
- `www/` 下文件改动后必须做视觉对比，确保和网页版一致

## ATS 与网络

- `Info.plist` 中 `NSAppTransportSecurity` 需允许 HTTP 明文（开发/测试阶段）
- 生产环境建议升级 HTTPS

## 热更新

1. 修改 `www/` 下文件
2. 递增 `FRONTEND_VERSION`
3. `rsync` 到 VPS: `rsync -avz www/ root@8.135.58.90:/opt/snail-books/ios-app/www/`
4. App 下次启动自动下载 zip → 切版本
