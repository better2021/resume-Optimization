/**
 * EdgeOne Function - POST /api/interview-analyze
 * 文件路径映射：cloud-functions/api/interview-analyze.js → /api/interview-analyze
 */

import { analyzeInterview } from '../ai.js';

async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    if (!body.systemPrompt || !body.userPrompt) {
      throw new Error('缺少 systemPrompt 或 userPrompt 参数');
    }
    const data = await analyzeInterview({ ...body, env: context.env });
    return new Response(JSON.stringify({ data, error: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ data: null, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export { onRequestPost };
