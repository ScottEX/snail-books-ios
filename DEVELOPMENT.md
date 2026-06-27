# 柳味探秘 · iOS App 开发规范

## 当前状态(2026-06-24)

iOS 端已经从 Capacitor 迁移到 **React Native + Expo 52**,并且已经完成了与 web 端 **UI/feature parity** 的迁移工作。**注意:web 端和 iOS 端仍然是两套独立的代码,不再自动同步。** 详见下文"web → iOS 同步"章节。

- **登录页**:可用(支持 webauthn / Face ID 自动登录),API 指向 `http://8.135.58.90:8601`
- **首页 + 全部业务屏**:已 RN 化,与 web UI 保持一致(收支 / 供应链 / 合伙人 / 每日营收 / 对账 / 个人中心 / 发票管理 / 用户管理 等)
- **i18n**:三语(zh-CN / zh-TW / en) + LangProvider + useLang hook
- **主题**:三套主题(勃艮第红 / 曜石黑金 / 深空青),与 web 保持一致
- **后端**:Flask on `8.135.58.90:8601`(web 和 iOS 共用)


## 技术栈

- **容器**: React Native(Expo 52)
- **JS**: React 18.3.1
- **构建**: Xcode + Expo prebuild + `npx expo run:ios`
- **Metro**: `localhost:8081`(开发期,JS 热重载)
- **后端**: Flask on `8.135.58.90:8601`
- **Bundle ID**: `com.lanx.snailbooks`

## 目录结构

```
snail-books-ios/
├── App.tsx                 ← 入口,LangProvider → SessionKickedModal → ThemeProvider → Login/Home
├── index.js                ← registerRootComponent + polyfills/localStorage
├── app.json                ← Expo 配置
├── assets/                 ← RN 本地资源(logo.jpg, bg.jpg)
├── ios/                    ← iOS 原生工程(AppDelegate, Pods, xcworkspace)
│   ├── app/                ← 标准 RN iOS 项目结构
│   └── app.xcworkspace     ← 用这个打开
├── src/
│   ├── screens/            ← 16 个业务屏(全部已 RN 化,与 web UI 一致)
│   │                        Login / Home / Expense / Procurement / Partner /
│   │                        DailyRevenue / ExpenseHistory / ReconHistory / ChartsPanel /
│   │                        ExpenseDetail / ProcurementDetail / Profile /
│   │                        UserManagement / UserDetail / Invoice / PdfPreview
│   ├── components/         ← 28 个共享组件(全部从 web 移植,RN 化)
│   │                        + icons/ 子目录(BackArrow, Camera, Plus/Minus, Trash)
│   ├── api/client.ts       ← iOS 端 API 客户端(默认指 8.135.58.90:8601)
│   │                        含 admin / invoice / webauthn / profile 等全部 endpoint
│   ├── i18n.tsx            ← 3 语 i18n(zh-CN / zh-TW / en)+ LangProvider + useLang
│   ├── i18nHelpers.ts      ← 内部 key ↔ 当前语言 翻译器
│   ├── theme.tsx           ← 主题(3 套)+ 动画常量 + REQUIRED_COLOR
│   ├── sharedStyles.ts     ← modalCard / historyHeader / uploadReceipt / spinner
│   ├── polyfills/
│   │   └── localStorage.ts ← AsyncStorage → localStorage + DOMMatrix + window + navigator shim
│   ├── platform.ts         ← 导出 localStorage + initStorageCache
│   ├── globals.ts          ← 副作用 import 目标(已 no-op,实际由 polyfills 处理)
│   ├── utils/              ← format / numbers / imagePicker / storage
│   └── hooks/              ← useDisclosure / usePaginatedList / useDateField / useImagePreview
└── patches/                ← patch-package 持久化的 patch
    └── expo-localization+16.0.1.patch
```

## 关键命令

```bash
# 启动 Metro(开发期,必须先跑)
npx expo start --port 8081

# 在另一个终端 build & run iOS app
./deploy.sh sim        # 模拟器
./deploy.sh phone      # 真机

# 跑 pod install(只在加新原生依赖后)
cd ios && pod install

# 查后端连通性
curl -X POST http://8.135.58.90:8601/login \
  -H "Content-Type: application/json" -H "X-Lang: zh-CN" \
  -d '{"username":"x","password":"x","remember":false}'
```

## 后端配置(API base)

`src/api/client.ts` 的 `getApiBase()` 返回:

1. `localStorage.getItem('api_base')` 如果用户手动设了
2. **RN 环境** → `http://8.135.58.90:8601`
3. **Web 环境** → `''` (相对 URL,同源)

**临时切换后端** (比如连本地 dev server):
```js
// 在 iOS 模拟器里打开任意已登录页面,在浏览器调试器里执行:
localStorage.setItem('api_base', 'http://192.168.x.x:8601')
// 然后重启 app
```

## 关键陷阱

### 键盘
- **iOS 模拟器:先按 ⌘K!** 硬件键盘连接时软键盘不显示

### ATS 与 HTTP 明文
- `ios/app/Info.plist` 的 `NSExceptionDomains` 已为 `8.135.58.90` 开了 HTTP 例外
- 改后端 IP / 端口时同步改这里
- 生产环境建议上 HTTPS

### Expo SDK 兼容性
- 必须装指定版本的依赖(`npx expo install --fix`),乱升版本会炸
- 已知的 SDK 兼容性 patch: `patches/expo-localization+16.0.1.patch`(iOS 26 Calendar.Identifier 新增 case)
- patch 通过 `postinstall` hook 自动应用,详见 `package.json`

### 启动 Metro 才能登录
- iOS app 是 DEBUG 构建,会从 `localhost:8081` 拉 JS bundle
- 没起 Metro 的话 app 启动会卡在 "Bundling..." 不会进主界面

---

## web → iOS 同步流程

### 架构现状

**iOS 和 web 是两个独立仓库,共用同一个后端,不共享前端代码:**

```
snail-books-web/                  snail-books-ios/                  snail-books-backend/
   (Expo 56 + RN-Web 0.85)         (Expo 52 + RN 0.76)              (Flask on 8.135.58.90:8601)
        │                                │                                  ▲
        │ 浏览器访问                      │ iOS 模拟器 / 真机                  │
        └────────────────────────────────┴──────────────────────────────────┘
                                  API 调用 / 登录 / 数据
```

**改 web 不会自动同步到 iOS**。本节定义手动同步流程。

### 触发:怎么知道 web 改了

3 种触发方式(任选):

1. **直接说**: "web 改了 X,搬到 iOS" / "查一下 web 最近一周"
2. **贴 commit**: "把 web commit abc123 搬过来" / "git diff 在这:[粘贴]"
3. **DEVELOPMENT.md 清单**: 每次 web 提交后,在下面的"待同步清单"加一行

我可以直接 `cd /Users/lanx/projects/snail-books-web && git log -p`,看 web 的提交历史,不需要你解释。

### 同步步骤(每条改动)

1. 我读 web 的 diff(`git show <commit>` 或 `git diff a..b`)
2. 对照下面的"移植 playbook",给出 iOS 端的改动 plan
3. 你说"做",我改 iOS
4. iOS 端 build 验证
5. 改完清单里那行打勾,写 commit message 引用 web 的 commit hash

### 待同步清单

> 维护原则:每次 web 提交,在这里加一行;每次同步完,打勾并加 commit 链接

**最高优先(用户可见 / 常用功能)**

- [ ] **3466ed2** — LoginScreen 加 avatar(web 头像)
  - web commit: `snail-books-web @ 3466ed2 feat: avatar on login page + partner page`
  - 改动: 头像在 `LoginScreen.tsx` line 198(web `<Image source={{uri: '/img/avatar.jpg'}}>`)
  - iOS 移植: 已有 RN 改写版,加个 `<Image source={require('../../assets/img/avatar.jpg')} />`
  - 预计: 20 分钟

- [x] **placeholder → 真实 HomeScreen / 业务屏** ✅ 2026-06-24 完成
  - 现状: 全部 16 个屏已 RN 化,与 web UI 一致
  - 改动: 9 个新屏从 web 移植(ChartsPanel/ExpenseDetail/Invoice/PdfPreview/ProcurementDetail/Profile/UserDetail/UserManagement),7 个旧屏(Log/DailyRev/Expense/Partner/Procurement/Recon/ExpenseHist)沿用上一轮 RN 化版本,HomeScreen 加了 Profile/Invoice/UserMgmt 入口 + SlideScreen 跳转

**中优先(修了但未到 iOS 的 bug / 文案)**

- [ ] **09782b6** — 分红派发日 + 备注格式
- [ ] **fa1f0f0** — 徽标/统计字号 + 颜色 #1EE69F + 分红弹窗
- [ ] **dcf1159** — i18n 文案 + 删除弹窗主题 + 日期补零
- [ ] **32a3914** — partner 屏日期显示
- [ ] **600b2e2** — 分红/投资日期 i18n
- [ ] **a7240a6** — translateDividendNote 从 dividend record 读日期
- [ ] **2e62855** — 合伙人卡片:日期显示 + 出资完成加绿 + 弹窗加宽
- [ ] **094a0c6** — 忘记密码→重置页去掉绿色成功消息

> 这些是 i18n 文案 / 小修复,等 HomeScreen 整体 RN 化时一起做更省事

**已同步**

- [x] **2026-06-24** 整体 UI 与 web 保持一致
  - 16 个屏 / 28 个组件 / 三语 i18n / 三套主题 / 全部 API endpoint 全部到位
  - TypeScript `npx tsc --noEmit` 通过

---

## 移植 playbook(web → RN 常见转换)

每次搬 web 改动,先查这张表。10 分钟搞定一个改动。

| Web 写法 | RN 写法 | 备注 |
|----------|---------|------|
| `<input type="date" />` | `<TextInput>` + `@react-native-community/datetimepicker` | iOS picker 是滚轮,Android 是日历 |
| `<input type="file" accept="image/*" />` | `<TouchableOpacity>` + `expo-image-picker.launchImageLibraryAsync()` | 注意权限 |
| `<input type="range" />` | `@react-native-community/slider` | 透明滑块用法稍不同 |
| `position: fixed` | `position: 'absolute'`,父容器 `flex: 1` | RN 没有真正的 fixed |
| `backdrop-filter: blur(20px)` | 半透明 `backgroundColor: 'rgba(0,0,0,0.55)'` | RN 暂无 backdrop filter,可考虑 `@react-native-community/blur` |
| `background-image: url(/img/x.jpg)` | `<ImageBackground source={require('../assets/img/x.jpg')}>` | 本地资源必须用 require() |
| `background-size: cover` | `ImageBackground` 配 `resizeMode="cover"` | |
| `100vw` / `100vh` | `Dimensions.get('window').width` / `.height` | 写死,旋转屏需重新计算 |
| `calc(100vw - 61px)` | 手动算: `Dimensions.get('window').width - 61` | 不支持 calc |
| `box-shadow: 0 2px 8px rgba(0,0,0,.1)` | iOS: `{ shadowColor, shadowOffset, shadowOpacity, shadowRadius }` / Android: `elevation: 4` | 两边分开写 |
| `onClick={fn}` | `onPress={fn}` | |
| `className="x"` | `style={styles.x}` | |
| `e.target.value` (input) | `e` 直接是 value(TextInput onChangeText 拿到) | |
| `localStorage.getItem('x')` | 已 shim,直接用 | `src/globals.ts` 在 index.js 顶部 import |
| `window.scrollY` | `ScrollView` 的 `onScroll` 事件 | |
| `<div className="modal">` | 自建 `<Animated.View>` + 半透明遮罩,或 `<Modal>` 组件 | 复杂模态(从顶部滑入)用 Animated |
| `document.createElement('canvas')` | RN 无 canvas;图片处理用 `expo-image-manipulator` | |
| `new Date().toLocaleDateString()` | `Intl.DateTimeFormat` 或 `dayjs` / `date-fns` | RN Hermes 0.x 不支持 Intl 某些 API |
| `<a href="https://...">` | `<TouchableOpacity onPress={() => Linking.openURL('https://...')}>` | |

### 几个具体示例

**1. 日期选择器**

```tsx
// Web
<input type="date" defaultValue={date} onChange={e => setDate(e.target.value)} />

// RN
import DateTimePicker from '@react-native-community/datetimepicker';
const [show, setShow] = useState(false);
<TouchableOpacity onPress={() => setShow(true)}>
  <Text>{date}</Text>
</TouchableOpacity>
{show && (
  <DateTimePicker
    value={new Date(date)}
    mode="date"
    onChange={(_, d) => { setShow(false); if (d) setDate(d.toISOString().slice(0, 10)); }}
  />
)}
```

**2. 图片上传**

```tsx
// Web
<input type="file" accept="image/*" onChange={e => handleFile(e.target.files[0])} />

// RN
import * as ImagePicker from 'expo-image-picker';
const pick = async () => {
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
  if (!r.canceled) handleFile(r.assets[0]);
};
<TouchableOpacity onPress={pick}><Text>选图</Text></TouchableOpacity>
```

**3. 滑块**

```tsx
// Web
<input type="range" min="0" max="1" step="0.05" value={v} onChange={e => setV(+e.target.value)} />

// RN
import Slider from '@react-native-community/slider';
<Slider minimumValue={0} maximumValue={1} step={0.05} value={v} onValueChange={setV} />
```

**4. 背景图(登录页那种)**

```tsx
// Web
<View style={{ backgroundImage: 'url(/img/bg.jpg)', backgroundSize: 'cover' }}>...</View>

// RN
<ImageBackground source={require('../../assets/img/bg.jpg')} style={styles.container} resizeMode="cover">
  <View style={styles.overlay} />  {/* 半透明黑色 overlay 替 backdrop-filter */}
  ...children
</ImageBackground>
```

### 不需要全像素对齐

**iOS 不必跟 web 长一样**。iOS 用户习惯:
- 全屏布局,不缩在 520px 居中卡片
- 大标题(17-19pt),中等正文(15pt),辅助文字(13pt)
- 左对齐、列表式
- 底部 Tab Bar
- 大块点击区(最少 44×44pt)

如果你 web 端是"卡片居中"风格,iOS 改成"全屏左对齐"反而是优势 —— 不同平台有不同体验,符合用户预期。

---

## 已知 web 比 iOS 多的(欠的债)

下面这些 web 有,iOS 这边没有或不是最新:

| 文件 | 差距 |
|------|------|
| `src/api/client.ts` | iOS 写死 `8.135.58.90:8601`,web 用相对 URL |
| `src/i18n.ts` | iOS 落后 web 多个 commit(翻译不全) |
| `src/utils/format.ts` | iOS 落后(可能 web 加了新格式化函数) |
| `src/screens/LoginScreen.tsx` | iOS 没有 avatar(web 加了) |
| `src/screens/HomeScreen.tsx` | iOS 没在用(placeholder) |
| `src/screens/ExpenseScreen.tsx` | iOS 落后(HTML input 还在,需要改) |
| `src/screens/ProcurementScreen.tsx` | iOS 落后 |
| `src/screens/PartnerScreen.tsx` | iOS 落后 |
| `src/screens/DailyRevenueHistory.tsx` | iOS 落后 |
| `src/screens/ExpenseHistoryScreen.tsx` | iOS 落后 |
| `src/screens/ReconHistoryScreen.tsx` | iOS 落后 |

iOS 独有(正常):
- `src/globals.ts`(RN shim)
- `src/platform.ts`(RN shim)
- `src/components/DebugBoundary.tsx`(调试用)

---

## 历史

- 2026-05-26 `c1b400b` 首次"迁移到 Expo web build"(原计划共享代码,实际未完成)
- 2026-06-02 `95554ad` 完成迁移:删除 Capacitor 残留,加 RN 依赖,装 globals shim
- 2026-06-02 `85311ff` HomeScreen 因 web-only 代码炸,临时用 placeholder
- 2026-06-02 `0fe5ebd` API base 切到 8.135.58.90:8601(生产服务器)
