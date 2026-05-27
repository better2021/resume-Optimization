/**
 * 本地开发服务器 - 模拟 EdgeOne Functions
 *
 * 启动方式：npm run dev
 * 监听端口：3000
 */

import 'dotenv/config';
import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const WordExtractor = require('word-extractor');

const app = express();
app.use(express.json({ limit: '10mb' }));

/* 直接使用核心函数 */
import { optimizeResume, analyzeInterview, generateIntroduction, localOptimize } from './ai.js';
import { sendEmail } from './email.js';

/* 本地版 handleSendEmail（带参数校验） */
async function handleSendEmail({ to, subject, text }) {
  if (!to) throw new Error('收件人邮箱地址不能为空');
  if (!subject) throw new Error('邮件主题不能为空');
  if (!text) throw new Error('邮件内容不能为空');
  await sendEmail({ to, subject, text });
  return { success: true };
}

app.post('/api/optimize', async (req, res) => {
  try {
    const data = await optimizeResume(req.body);
    res.json({ data, error: null });
  } catch (e) {
    console.error('[云函数] 优化失败:', e.message);
    res.status(500).json({ data: null, error: e.message });
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const data = await handleSendEmail(req.body);
    res.json({ data, error: null });
  } catch (e) {
    console.error('[邮件] 发送失败:', e.message);
    res.status(500).json({ data: null, error: e.message });
  }
});

app.post('/api/interview-analyze', async (req, res) => {
  try {
    const { systemPrompt, userPrompt, model } = req.body;
    if (!systemPrompt || !userPrompt) {
      throw new Error('缺少 systemPrompt 或 userPrompt 参数');
    }
    const data = await analyzeInterview({
      systemPrompt,
      userPrompt,
      model: model || 'glm',
      env: {},
    });
    res.json({ data, error: null });
  } catch (e) {
    console.error('[面试分析] 失败:', e.message);
    res.status(500).json({ data: null, error: e.message });
  }
});

app.post('/api/generate-introduction', async (req, res) => {
  try {
    const { text, model, systemPrompt } = req.body;
    if (!text) throw new Error('简历内容不能为空');
    const data = await generateIntroduction({
      text,
      model: model || 'glm',
      systemPrompt,
      env: {},
    });
    res.json({ data, error: null });
  } catch (e) {
    console.error('[自我介绍] 失败:', e.message);
    res.status(500).json({ data: null, error: e.message });
  }
});

/* 简历局部优化 - 针对简历片段进行定向优化 */
app.post('/api/local-optimize', async (req, res) => {
  try {
    const { text, requirement, model, systemPrompt } = req.body;
    if (!text) throw new Error('简历内容不能为空');
    if (!requirement) throw new Error('优化需求不能为空');
    const data = await localOptimize({
      text,
      requirement,
      model: model || 'glm',
      systemPrompt,
      env: {},
    });
    res.json({ data, error: null });
  } catch (e) {
    console.error('[局部优化] 失败:', e.message);
    res.status(500).json({ data: null, error: e.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', apiKeyConfigured: !!process.env.GLM_API_KEY }, error: null });
});

/* 解析 .doc（旧版 Word 二进制格式）文件 */
app.post('/api/parse-doc', async (req, res) => {
  try {
    const { fileBase64 } = req.body;
    if (!fileBase64) throw new Error('文件内容不能为空');

    const buffer = Buffer.from(fileBase64, 'base64');
    const extractor = new WordExtractor();
    const extracted = await extractor.extract(buffer);
    const text = extracted.getBody();

    res.json({ data: { text }, error: null });
  } catch (e) {
    console.error('[文档解析] .doc 解析失败:', e.message);
    res.status(500).json({ data: null, error: '文件解析失败，请确认文件格式正确' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`[云函数] 本地服务已启动 → http://localhost:${PORT}`);
  console.log(`[云函数] 健康检查 → http://localhost:${PORT}/api/health`);
  console.log(`[云函数] 优化接口 → POST http://localhost:${PORT}/api/optimize`);
  if (!process.env.GLM_API_KEY) {
    console.warn('[云函数] ⚠️  未配置 GLM_API_KEY，请复制 .env.example 为 .env 并填入 API Key');
  }
});
