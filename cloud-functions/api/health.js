/**
 * EdgeOne Function - GET /api/health
 * 文件路径映射：cloud-functions/api/health.js → /api/health
 */

async function onRequestGet(context) {
  const env = context.env || {};
  return new Response(JSON.stringify({
    data: { status: 'ok', apiKeyConfigured: !!(env.GLM_API_KEY || env.DEEPSEEK_API_KEY) },
    error: null,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export { onRequestGet };
