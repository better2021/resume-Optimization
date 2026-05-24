/**
 * EdgeOne Functions 云函数 - 简历优化
 *
 * 本文件包含核心业务逻辑：
 * 1. 根据优化目标构建不同的 Prompt
 * 2. 调用 GLM-4-Flash API 进行简历优化
 * 3. 解析 AI 返回结果
 *
 * 部署到 EdgeOne 时只需导出 handleRequest 函数即可。
 * 本地开发使用 server.js 包装为 Express 服务器。
 */

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const prompts = require('./prompts');
const { sendEmail } = require('./email');

/* 不同优化目标的系统提示词 */
function buildSystemPrompt(goal) {
  return prompts[goal] || prompts['highlight-achievements'];
}

/* 构建用户提示词 */
function buildUserPrompt(text, jd) {
  let prompt = `请优化以下简历内容：\n\n${text}\n\n`;
  prompt += `请按以下 JSON 格式返回结果（不要包含 markdown 代码块标记，直接返回纯 JSON）：\n`;
  prompt += JSON.stringify({
    score: '整数，1-100 的简历评分',
    suggestions: ['字符串数组，3-5 条具体优化建议'],
    optimizedText: '优化后的完整简历文本',
  });
  if (jd) {
    prompt += `\n\n参考职位描述：\n${jd}`;
  }
  return prompt;
}

/* 调用 GLM-4-Flash API */
async function callGLM(systemPrompt, userPrompt) {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    throw new Error('GLM_API_KEY 未配置');
  }

  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`GLM API 请求失败 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('GLM API 返回为空');
  }
  return content;
}

/* 调用 DeepSeek API */
async function callDeepSeek(systemPrompt, userPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`DeepSeek API 请求失败 (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('DeepSeek API 返回为空');
  }
  return content;
}

/* 多策略解析 AI 返回的 JSON —— 兼容各种非标准格式 */
function tryParseJSON(str) {
  /* 策略 1：标准解析 */
  try { return JSON.parse(str); } catch {}

  /* 策略 2：清除控制字符后解析（换行/制表符等） */
  const cleaned = str.replace(/[\x00-\x1F\x7F]/g, '');
  try { return JSON.parse(cleaned); } catch {}

  /* 策略 3：单引号转双引号（AI 可能返回 JS 对象格式） */
  try {
    /* 替换单引号包裹的属性名：'key': -> "key": */
    const step1 = cleaned.replace(/'([^']+)'\s*:/g, '"$1":');
    /* 替换单引号包裹的字符串值：: 'value' -> : "value" */
    const step2 = step1.replace(/:\s*'([^']*?)'\s*([,}\]])/g, ': "$1"$2');
    return JSON.parse(step2);
  } catch {}

  throw new Error('AI 返回的 JSON 格式无法解析');
}

/* 解析 AI 返回的 JSON */
function parseResult(content) {
  /* 尝试提取 JSON（兼容 AI 可能返回 markdown 代码块的情况） */
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  }
  const parsed = tryParseJSON(jsonStr.trim());
  return {
    optimizedText: parsed.optimizedText || content,
    score: typeof parsed.score === 'number' ? parsed.score : 70,
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  };
}

/* 核心优化函数 */
async function optimizeResume({ text, goal, jd, model }) {
  const systemPrompt = buildSystemPrompt(goal);
  const userPrompt = buildUserPrompt(text, jd);
  const caller = model === 'deepseek' ? callDeepSeek : callGLM;
  const content = await caller(systemPrompt, userPrompt);
  return parseResult(content);
}

/**
 * 发送简历到邮箱
 */
async function handleSendEmail({ to, subject, text }) {
  if (!to) throw new Error('收件人邮箱地址不能为空');
  if (!subject) throw new Error('邮件主题不能为空');
  if (!text) throw new Error('邮件内容不能为空');
  await sendEmail({ to, subject, text });
  return { success: true };
}

/* EdgeOne Functions 标准入口 */
async function handleRequest(request) {
  try {
    const url = new URL(request.url);

    if (url.pathname === '/api/optimize' && request.method === 'POST') {
      const body = await request.json();
      const data = await optimizeResume(body);
      return new Response(JSON.stringify({ data, error: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === '/api/send-email' && request.method === 'POST') {
      const body = await request.json();
      const data = await handleSendEmail(body);
      return new Response(JSON.stringify({ data, error: null }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ data: null, error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ data: null, error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/* 导出供 server.js 使用 */
if (typeof module !== 'undefined') {
  module.exports = { handleRequest, optimizeResume, handleSendEmail };
}
