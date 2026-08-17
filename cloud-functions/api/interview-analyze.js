/**
 * EdgeOne Function - POST /api/interview-analyze
 * 文件路径映射：cloud-functions/api/interview-analyze.js → /api/interview-analyze
 */

import { analyzeInterview, analyzeInterviewStream } from '../ai.js';

const encoder = new TextEncoder();

/* 写入一个 SSE 事件，保证前端可逐段解析（与 server.js 的 writeStreamEvent 格式一致） */
function writeStreamEvent(writer, event, payload) {
  writer.write(encoder.encode(`event: ${event}\n`));
  writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

async function onRequestPost(context) {
  try {
    const request = context.request;
    const body = await request.json();
    if (!body.systemPrompt || !body.userPrompt) {
      throw new Error('缺少 systemPrompt 或 userPrompt 参数');
    }

    /* 流式模式：前端按 SSE 事件流逐段读取，必须返回 text/event-stream 而非 JSON */
    if (body.stream) {
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();

      (async () => {
        try {
          await analyzeInterviewStream({
            systemPrompt: body.systemPrompt,
            userPrompt: body.userPrompt,
            model: body.model || 'glm',
            env: context.env,
            onToken: token => writeStreamEvent(writer, 'token', { token }),
          });
          writeStreamEvent(writer, 'done', { success: true });
        } catch (e) {
          writeStreamEvent(writer, 'error', { error: e.message });
        } finally {
          writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
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
