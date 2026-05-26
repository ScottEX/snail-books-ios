# 蓝姐螺蛳粉 · iOS App 开发规范

## 技术栈
- **容器**: Capacitor（WKWebView）
- **前端**: Expo / React Native Web（与 `snail-books-web` 同一套代码）
- **认证**: Bearer token（WKWebView 丢弃跨域 cookie）
- **构建**: Xcode + `npx cap copy ios`
- **Bundle ID**: `com.lanx.snailbooks`

## 架构

```
snail-books-web (Expo/React)
    │
    │  npm run build:web
    ▼
snail-books-web/dist/    ──copy──▶  snail-books-ios/www/
                                       │
                                       │  npx cap copy ios
                                       ▼
                                 ios/App/App/public/
                                       │
                                       │  xcodebuild
                                       ▼
                                 iOS App (.app)
```

iOS 和 Web 共用同一套 React 代码。iOS 端只是 Capacitor 壳 + Expo web 构建产物。

## 构建流程

### 一键构建（推荐）
```bash
cd /Users/lanx/projects/snail-books-ios
bash deploy.sh sim     # 模拟器
bash deploy.sh phone   # 真机
```

`deploy.sh` 依次执行:
1. 构建 Expo web: `cd ../snail-books-web && npm run build:web`
2. 同步 www/ 内容
3. `npx cap copy ios`
4. xcodebuild + 安装到模拟器

### 手动构建
```bash
# 1. 构建前端
cd ../snail-books-web && npm run build:web && cd -

# 2. 同步 www/
cp -r ../snail-books-web/dist/* www/

# 3. Capacitor
npx cap copy ios

# 4. Xcode
cd ios/App && xcodebuild -project App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 16 Pro' \
  -derivedDataPath build build
```

### 只改前端代码时
1. 在 `snail-books-web` 里改 React 代码
2. `npm run build:web`（或在 web 端 `npm run web` 实时预览）
3. 回到 iOS: `bash deploy.sh sim`
4. 模拟器中 kill App 再打开即可看到改动

## 静态资源

| 文件 | 位置 | 说明 |
|------|------|------|
| bg.jpg | `www/static/bg.jpg` | 登录页背景 |
| logo.jpg | `www/static/logo.jpg` | Logo |
| home-bg.jpg | `www/static/home-bg.jpg` | 首页背景（用户上传） |

## API 连接

App 通过 `localStorage.api_base` 确定后端地址:
- 首次启动时 `boot.js` 检测 Capacitor 环境，自动设置 `http://8.135.58.90:8600`
- 用户可在 Web 端浏览器中手动设置 `localStorage.setItem('api_base', '...')`
- Web 端默认为同源（`''`）

## 关键陷阱

### 键盘
- **iOS 模拟器：先按 ⌘K！** 硬件键盘连接时软键盘不显示

### WKWebView 认证
- WKWebView 会丢弃跨域 `Set-Cookie`
- 必须用 Bearer Token 替代 session cookie
- 登录后存 `token` 到 localStorage，请求带 `Authorization: Bearer <token>`

### capacitor.config.json
- **不要配 `server.url`** — 离线模式，App 从本地加载前端代码
- 改 `capacitor.config.json` 后必须重新 `npx cap copy ios`

### iOS 安全区域
- iOS 刘海/灵动岛需要 `env(safe-area-inset-top)`
- Expo 构建时 viewport 已配置 `viewport-fit=cover`

## ATS 与网络
- `Info.plist` 中 `NSAppTransportSecurity` 需允许 HTTP 明文（开发/测试阶段）
- 生产环境建议升级 HTTPS

## 代码规范
- **所有前端改动在 `snail-books-web` 中完成，不要在 `www/` 里直接改**
- `www/` 是构建产物，不提交到 git（已在 .gitignore 中排除）
- 改完前端后必须在 iOS 模拟器验证视觉效果一致性
