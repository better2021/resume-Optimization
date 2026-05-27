/**
 * SCF 云函数入口 - 供腾讯云函数 + API 网关部署
 *
 * 部署方式：
 * 1. 将 cloud-functions/ 目录打包为 zip
 * 2. 上传到 SCF → Node.js 18+ 运行时
 * 3. 创建 API 网关触发器（启用集成响应）
 * 4. 配置环境变量（GLM_API_KEY / DEEPSEEK_API_KEY）
 *
 * 请求 → API 网关 → SCF(event, context) → API 网关 → 响应
 * 本地开发仍使用 server.js（Express）
 */

import { optimizeResume, analyzeInterview, generateIntroduction, localOptimize } from './ai.js';
import { sendEmail } from './email.js';

/* 统一成功响应 */
function ok(body) {
  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify(body),
  };
}

/* 统一错误响应 */
function fail(statusCode, message) {
  return {
    isBase64Encoded: false,
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify({ data: null, error: message }),
  };
}

/* 处理函数路由表 */
const routes = {
  'POST /api/optimize': async (body) => {
    if (!body.text) throw new Error('简历内容不能为空');
    const data = await optimizeResume(body);
    return ok({ data, error: null });
  },

  'POST /api/interview-analyze': async (body) => {
    if (!body.systemPrompt || !body.userPrompt) throw new Error('缺少 systemPrompt 或 userPrompt 参数');
    const data = await analyzeInterview(body);
    return ok({ data, error: null });
  },

  'POST /api/generate-introduction': async (body) => {
    if (!body.text) throw new Error('简历内容不能为空');
    const data = await generateIntroduction(body);
    return ok({ data, error: null });
  },

  'POST /api/local-optimize': async (body) => {
    if (!body.text) throw new Error('简历内容不能为空');
    if (!body.requirement) throw new Error('优化需求不能为空');
    const data = await localOptimize(body);
    return ok({ data, error: null });
  },

  'POST /api/send-email': async (body) => {
    if (!body.to) throw new Error('收件人邮箱地址不能为空');
    if (!body.subject) throw new Error('邮件主题不能为空');
    if (!body.text) throw new Error('邮件内容不能为空');
    await sendEmail(body);
    return ok({ data: { success: true }, error: null });
  },

  'GET /api/health': async () => {
    return ok({
      data: {
        status: 'ok',
        apiKeyConfigured: !!(process.env.GLM_API_KEY || process.env.DEEPSEEK_API_KEY),
      },
      error: null,
    });
  },
};

/* 入口函数 */
export const main_handler = async (event, context) => {
  try {
    /* CORS 预检请求直接返回 200 */
    if (event.httpMethod === 'OPTIONS') {
      return ok({ data: null, error: null });
    }

    const routeKey = `${event.httpMethod} ${event.path}`;
    const handler = routes[routeKey];

    if (!handler) {
      return fail(404, `路由未匹配: ${routeKey}`);
    }

    const body = event.body ? JSON.parse(event.body) : {};
    return await handler(body);
  } catch (e) {
    console.error(`[SCF] ${event.httpMethod} ${event.path} 失败:`, e.message);
    return fail(500, e.message);
  }
};
