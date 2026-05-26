# 简历优化器

基于 AI（GLM-4-Flash / DeepSeek）的简历优化 + 面试辅助 SaaS 工具，帮助求职人员快速优化简历、准备面试。

## 技术栈

- **前端**：Vue 3 + Vite + Tailwind CSS（TypeScript 严格模式）
- **后端**：EdgeOne Functions（腾讯云边缘函数）
- **AI**：智谱 GLM-4-Flash / DeepSeek Chat API
- **本地开发**：Express（模拟 EdgeOne Functions 环境）

## 目录结构

```
resume-optimizer/
├── src/                          # Vue 3 前端代码
│   ├── api/                     # API 请求层
│   ├── components/              # 组件
│   │   ├── FileUploader.vue     # 文件上传（拖拽 + 点击）
│   │   ├── ResumeEditor.vue     # 简历文本编辑器
│   │   ├── OptimizeOptions.vue  # 优化目标选择
│   │   ├── DiffPreview.vue      # 优化前后对比
│   │   ├── DownloadBar.vue      # 下载 + 生成自我介绍
│   │   └── InterviewAssistant.vue # 面试辅助器
│   ├── prompts/                 # AI 提示词
│   │   ├── interview.ts         # 面试分析提示词
│   │   └── introduction.ts      # 自我介绍提示词
│   ├── types/                   # TypeScript 类型定义
│   ├── App.vue                  # 根组件（浮动导航）
│   └── main.ts
├── cloud-functions/             # 后端代码
│   ├── api/                     # EdgeOne Functions 入口（按路由分文件）
│   │   ├── optimize.js          #   POST /api/optimize
│   │   ├── interview-analyze.js #   POST /api/interview-analyze
│   │   ├── generate-introduction.js # POST /api/generate-introduction
│   │   ├── send-email.js        #   POST /api/send-email
│   │   └── health.js            #   GET  /api/health
│   ├── ai.js                    # AI 调用核心逻辑（GLM / DeepSeek）
│   ├── prompts.js               # 简历优化系统提示词库
│   ├── email.js                 # 邮件发送
│   ├── server.js                # 本地开发 Express 服务器
│   ├── package.json
│   └── .env.example
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## 本地启动步骤

### 前置条件

- Node.js >= 18
- 智谱 AI API Key（[免费申请](https://open.bigmodel.cn/)）或 DeepSeek API Key

### 1. 配置云函数环境变量

```bash
cd cloud-functions/
cp .env.example .env
```

编辑 `cloud-functions/.env`，填入 API Key：

```
GLM_API_KEY=你的GLM_API_Key
DEEPSEEK_API_KEY=你的DeepSeek_API_Key
```

### 2. 启动云函数服务

```bash
cd cloud-functions/
npm install
npm run dev
```

终端输出 `[云函数] 本地服务已启动 → http://localhost:3000` 即代表启动成功。

### 3. 启动前端开发服务器

```bash
# 新开终端，回到项目根目录
npm install
npm run dev
```

终端输出 `http://localhost:3001` 即代表启动成功。

### 4. 验证项目

1. 浏览器打开 `http://localhost:3001`
2. 确认页面正常加载，左侧有浮动导航（简历优化器 / 面试辅助器）
3. 验证云函数：`curl http://localhost:3000/api/health`
4. 上传一份 PDF 或 Word 简历，确认解析正确
5. 选择优化目标，点击"优化简历"，确认 AI 返回优化结果

## 功能说明

### 简历优化器
- **上传简历**：支持拖拽或点击上传 PDF / Word 文件
- **编辑简历**：解析后的文本展示在编辑器中，支持手动修改
- **AI 优化**：6 种优化目标（突出成果 / 匹配 JD / 精简表达 / 突出技能 / 职业转型 / 职级提升），可选 GLM 或 DeepSeek 模型
- **对比预览**：分栏对比优化前后文本
- **生成自我介绍**：根据简历内容生成精简口语化自我介绍（1-2 分钟）
- **下载结果**：支持下载为 Word（.docx）或 PDF 格式

### 面试辅助器
- **JD 分析**：输入职位描述文本或上传 JD 截图（最多 5 张），AI 深度解析岗位要求
- **面试预测**：预测 6 道高概率面试题，每题含回答思路和示例
- **结果导出**：支持下载分析结果为图片（PNG）或 Markdown 文档

---

# 部署到腾讯云 SCF + API 网关

## 架构说明

```
用户 → API 网关 → SCF 云函数 → AI API (GLM / DeepSeek)
                ↓
            前端静态资源 (dist/ 托管到 COS 或 Vercel)
```

所有 AI 调用通过 SCF 代理，前端不暴露 API Key。

---

## 部署步骤

### 第一步：构建前端

```bash
# 项目根目录
npm run build
```

构建产物在 `dist/` 目录，后续需托管到静态服务。

### 第二步：打包云函数

```bash
# 将 cloud-functions/ 目录打包为 zip
cd cloud-functions/
zip -r ../scf-deploy.zip . -x "node_modules/.bin/*" "node_modules/*.md" ".env"
```

> ⚠️ 如果 `zip` 命令不可用，可以手动压缩：右键 `cloud-functions/` 文件夹 → 压缩为 zip

### 第三步：创建云函数

登录 [云函数控制台](https://console.cloud.tencent.com/scf) → **函数服务** → **新建**：

| 配置项 | 值 |
|--------|-----|
| 函数名称 | `resume-optimizer` |
| 运行环境 | Node.js 18+ |
| 创建方式 | **空白函数** |
| 提交方法 | **本地上传 zip 包** → 上传第二步的 `scf-deploy.zip` |
| 执行方法 | `scf.main_handler` |
| 高级配置 → 环境变量 | 按下方表格配置 |

### 第四步：配置环境变量

在函数 **高级配置 → 环境变量** 中配置：

| 变量名 | 说明 |
|--------|------|
| `GLM_API_KEY` | 智谱 AI API Key |
| `DEEPSEEK_API_KEY` | DeepSeek API Key |
| `SMTP_HOST` | SMTP 服务器地址（发邮件功能用）|
| `SMTP_PORT` | SMTP 端口 |
| `SMTP_USER` | SMTP 用户名 |
| `SMTP_PASS` | SMTP 密码 |
| `SMTP_FROM` | 发件人邮箱 |

### 第五步：创建 API 网关触发器

函数创建后，切换到 **触发管理** → **创建触发器**：

| 配置项 | 值 |
|--------|-----|
| 触发方式 | **API 网关** |
| 集成响应 | ✅ **启用**（必须勾选，否则返回 502） |

创建成功后 API 网关会生成一个默认访问地址，格式如：
```
https://service-xxxxx-xxx.gz.apigw.tencentcs.com
```

### 第六步：托管前端静态资源

`dist/` 目录可以选择以下方式托管：

**方式一：Vercel（推荐，免费）**
```bash
# 安装 Vercel CLI
npm i -g vercel
# 部署
cd dist/
vercel --prod
```
Vercel 会自动生成可用域名。

**方式二：腾讯云 COS**
1. 创建 COS 存储桶 → 开启静态网站
2. 上传 `dist/` 目录到存储桶
3. 获取 COS 静态网站域名

### 第七步：连接前端和后端

在前端项目根目录的 `.env` 中添加 API 网关地址：

```env
VITE_API_BASE=https://service-xxxxx-xxx.gz.apigw.tencentcs.com
```

如果直接用 Vercel 托管的前端，也可以在前端代码 `src/api/index.ts` 中将 `API_BASE` 改为 API 网关地址。

### 第八步：验证部署

1. 健康检查：`curl https://你的API网关域名/api/health`
   → 应返回 `{"data":{"status":"ok",...},"error":null}`
2. 打开前端页面，上传简历测试优化功能
3. 测试面试分析功能

---

## 常见问题

**Q: API 网关返回 502？**

A: 大概率是集成响应未开启。检查函数触发器配置，确认 **集成响应** 已勾选。

**Q: 前端请求接口报跨域错误？**

A: SCF 入口已内置 `Access-Control-Allow-Origin: *` 响应头。如果还有跨域问题，可以在 API 网关侧配置跨域规则。

**Q: 本地开发如何调试？**

A: 使用 Express 模拟：
```bash
cd cloud-functions/
npm run dev
```
然后在另一个终端启动 Vite：
```bash
npm run dev
```

**Q: AI 响应超时怎么办？**

A: 当前超时设置为 60 秒。如果经常超时，可以在 SCF 函数配置中调大 **执行超时时间**（建议 120 秒），同时调整 `cloud-functions/ai.js` 中的 `API_TIMEOUT` 值。
