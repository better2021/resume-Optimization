/**
 * 本地开发服务器 - 模拟 EdgeOne Functions
 *
 * 启动方式：npm run dev
 * 监听端口：3000
 */

require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json({ limit: '10mb' }));

/* 直接使用核心函数，避免 Node.js 中 new Response() 的兼容问题 */
const { optimizeResume, handleSendEmail } = require('./index');

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

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok', apiKeyConfigured: !!process.env.GLM_API_KEY }, error: null });
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
