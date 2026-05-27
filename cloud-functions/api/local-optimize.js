/**
 * EdgeOne Function - POST /api/local-optimize
 * 文件路径映射：cloud-functions/api/local-optimize.js → /api/local-optimize
 */

import { localOptimize } from '../ai.js';

async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    if (!body.text) throw new Error('简历内容不能为空');
    if (!body.requirement) throw new Error('优化需求不能为空');
    const data = await localOptimize({ ...body, env: context.env });
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
