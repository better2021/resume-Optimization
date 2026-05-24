/**
 * EdgeOne Function - POST /api/optimize
 * 文件路径映射：cloud-functions/api/optimize.js → /api/optimize
 */

const { optimizeResume } = require('../ai');

async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    const data = await optimizeResume(body);
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

module.exports = { onRequestPost };
