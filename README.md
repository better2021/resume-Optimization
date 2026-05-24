# 简历优化器

基于 AI（GLM-4-Flash）的简历优化 SaaS 工具，帮助求职人员快速优化简历、获取面试机会。

## 技术栈

- **前端**：Vue 3 + Vite + Tailwind CSS（TypeScript 严格模式）
- **后端**：EdgeOne Functions 云函数（Node.js 环境）
- **AI**：智谱 GLM-4-Flash API

## 目录结构

```
resume-optimizer/
├── src/                    # Vue 3 前端代码
│   ├── api/               # API 请求层
│   │   └── index.ts
│   ├── components/        # 组件
│   │   ├── FileUploader.vue      # 文件上传（拖拽 + 点击）
│   │   ├── ResumeEditor.vue      # 简历文本编辑器
│   │   ├── OptimizeOptions.vue   # 优化目标选择
│   │   ├── DiffPreview.vue       # 优化前后对比
│   │   └── DownloadBar.vue       # 下载 Word / PDF
│   ├── types/             # TypeScript 类型定义
│   │   └── index.ts
│   ├── App.vue            # 根组件
│   ├── main.ts            # 入口文件
│   └── style.css          # 全局样式
├── functions/             # EdgeOne Functions 云函数
│   ├── index.js           # 核心业务逻辑（Prompt 构建 + GLM API 调用）
│   ├── server.js          # 本地开发 Express 服务器
│   ├── package.json
│   └── .env.example       # 环境变量模板
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── .gitignore
└── README.md
```

## 本地启动步骤

### 前置条件

- Node.js >= 18
- 智谱 AI API Key（[免费申请](https://open.bigmodel.cn/)）

### 1. 配置云函数环境变量

```bash
cd functions/
cp .env.example .env
```

编辑 `functions/.env`，填入你的 GLM API Key：

```
GLM_API_KEY=你的API_Key
```

### 2. 启动云函数服务

```bash
cd functions/
npm install
npm run dev
```

终端输出 `[云函数] 本地服务已启动 → http://localhost:3000` 即代表启动成功。

### 3. 启动前端开发服务器

```bash
# 新开终端，回到项目根目录
cd resume-optimizer/
npm install
npm run dev
```

终端输出 `http://localhost:3001` 即代表启动成功。

### 4. 验证项目

1. 浏览器打开 `http://localhost:3001`
2. 确认页面正常加载，显示"简历优化器"标题和文件上传区域
3. 验证云函数：`curl http://localhost:3000/api/health` 返回 `{"data":{"status":"ok",...},"error":null}`
4. 上传一份 PDF 或 Word 简历，确认解析正确
5. 选择优化目标，点击"优化简历"，确认 AI 返回优化结果

## 功能说明

- **上传简历**：支持拖拽或点击上传 PDF / Word 文件
- **编辑简历**：解析后的文本展示在编辑器中，支持手动修改
- **AI 优化**：根据选择的优化目标（突出成果 / 匹配 JD / 精简表达 / 突出技能），通过云函数调用 GLM-4-Flash 生成优化建议和优化后文本
- **对比预览**：分栏对比优化前后文本，或仅查看优化后结果
- **下载结果**：支持下载为 Word（.docx）或 PDF 格式

## 后续可迭代功能

1. **多简历管理**：支持同时上传多份简历，在历史记录中切换对比
2. **智能匹配**：根据用户输入的目标公司和岗位，自动抓取 JD 并匹配优化策略
3. **简历模板**：提供多套专业简历模板，一键套用格式化输出
