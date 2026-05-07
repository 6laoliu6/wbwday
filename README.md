# WBWday

WBWday 是一个本地优先、无登录、无服务器的日常任务 App。

它不是普通待办软件，而是围绕一天完整流程设计的个人仪式工具：

```text
早晨立愿 -> 今日任务 -> 专注训练 -> 拍照还愿 -> 晚间复盘 -> 历史记录
```

## 功能

- 晨间规划：输入一段自然语言，自动拆分为多个任务草稿。
- 今日任务：任务卡片、重要程度、今日三件大事、拖动排序。
- 任务详情：查看任务信息、专注记录、还愿记录。
- 专注训练：普通计时、番茄钟 25 分钟、累计专注时长。
- 拍照还愿：拍照或选择相册图片，保存完成证明和完成感想。
- 晚间复盘：完成统计、专注时长、照片墙、评分、今日总结。
- 历史记录：按日期查看过去的任务、复盘和还愿照片。
- 主题系统：支持 9 组撞色主题，并本地持久化。

## 技术栈

- Expo
- React Native
- TypeScript
- Expo Router
- AsyncStorage
- expo-image-picker
- expo-file-system
- expo-image-manipulator
- expo-haptics

## 本地优先

- 不需要登录。
- 不需要服务器。
- 不接云同步。
- 任务、复盘、主题设置等数据保存在手机本地。
- 还愿照片会复制到 App 本地持久目录，只保存本地 URI，不上传云端。

## 运行

安装依赖：

```bash
npm install
```

启动 Expo：

```bash
npm run start
```

常用入口：

```bash
npm run android
npm run web
```

## 检查

类型检查：

```bash
npm run typecheck
```

Expo 依赖检查：

```bash
npx expo install --check
```

Expo Doctor：

```bash
npx expo-doctor
```

## Android APK 构建

项目已配置 `preview-apk` profile，可用于生成 Android APK：

```bash
npx eas-cli build -p android --profile preview-apk
```

构建配置在：

```text
eas.json
```

Android 包名：

```text
com.wang.wbwday
```

## 项目结构

```text
app/
  focus/        专注训练页面
  proof/        拍照还愿页面
  review/       晚间复盘页面
  task/         任务详情与添加任务页面
  index.tsx     今日首页
  plan.tsx      晨间规划
  history.tsx   历史记录
  theme.tsx     主题选择

src/
  components/   通用组件和业务组件
  storage/      本地存储仓库
  theme/        主题 token 和 ThemeProvider
  types/        TypeScript 类型
  utils/        日期、时间、解析、统计、触感反馈工具
```

## 说明

WBWday 当前定位为个人自用 MVP。暂不包含登录、云同步、社区、AI 分析、真实天气或新闻 API。
