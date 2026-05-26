/**
 * AI 优化核心逻辑 - 供 EdgeOne Functions 和本地服务器共用
 */

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const API_TIMEOUT = 60000;
import prompts from './prompts.js';

function getEnvValue(env, key) {
  return env?.[key] || (typeof process !== 'undefined' ? process.env?.[key] : undefined);
}

/* 不同优化目标的系统提示词 */
function buildSystemPrompt(goal) {
  return prompts[goal] || prompts['highlight-achievements'];
}

/* 构建用户提示词 */
function buildUserPrompt(text, jd) {
  let prompt = `请优化以下简历内容：\n\n${text}\n\n`;
  prompt += `要求精简输出：删除套话和冗余内容，保留核心成果数据，每条经历保持原有信息量但更紧凑。\n\n`;
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
async function callGLM(systemPrompt, userPrompt, env) {
  const apiKey = getEnvValue(env, 'GLM_API_KEY');
  if (!apiKey) {
    throw new Error('GLM_API_KEY 未配置');
  }

  const response = await fetch(GLM_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(API_TIMEOUT),
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3072,
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
async function callDeepSeek(systemPrompt, userPrompt, env) {
  const apiKey = getEnvValue(env, 'DEEPSEEK_API_KEY');
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(API_TIMEOUT),
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 3072,
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
async function optimizeResume({ text, goal, jd, model, env }) {
  const systemPrompt = buildSystemPrompt(goal);
  const userPrompt = buildUserPrompt(text, jd);
  const caller = model === 'deepseek' ? callDeepSeek : callGLM;
  const content = await caller(systemPrompt, userPrompt, env);
  return parseResult(content);
}

/* 面试分析 - 基于 JD 内容分析面试方向 */
async function analyzeInterview({ systemPrompt, userPrompt, model, env }) {
  const caller = model === 'deepseek' ? callDeepSeek : callGLM;
  const content = await caller(systemPrompt, userPrompt, env);

  /* 提取 JSON：兼容 markdown 代码块或 AI 前置说明文字 */
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1];
  } else {
    const firstBrace = content.indexOf('{');
    const lastBrace = content.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = content.slice(firstBrace, lastBrace + 1);
    }
  }

  /* 去除尾部逗号 */
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  /* DEBUG: 输出 AI 原始返回供排查 */
  console.error('[DEBUG analyzeInterview] raw content:', content.slice(0, 800));
  console.error('[DEBUG analyzeInterview] extracted jsonStr:', jsonStr.slice(0, 800));

  const parsed = tryParseJSON(jsonStr.trim());
  return {
    summary: parsed.summary || '',
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  };
}

/* 生成自我介绍 - 基于简历内容 */
async function generateIntroduction({ text, model, env }) {
  const caller = model === 'deepseek' ? callDeepSeek : callGLM;
  const systemPrompt = '你是资深面试辅导专家，擅长帮助候选人撰写精简有吸引力的自我介绍。\n\n任务：根据候选人简历内容，撰写一份适合面试场景的自我介绍。\n\n【要求】\n- 精简干练：控制在 1-2 分钟内能说完\n- 口语化：听起来自然流畅，不像是念稿\n- 容易记忆：有清晰的逻辑线索（如 过去→现在→未来）\n- 吸引面试官：开头有亮点，突出核心优势\n- 结构完整：包含开场、经历亮点、为什么适合该岗位、结尾\n\n【输出规范】\n- 直接输出自我介绍文本，不要额外说明\n- 用换行分隔段落，每段 2-3 句话\n- 全文不超过 300 字';
  const userPrompt = `请根据以下简历内容，撰写一份面试自我介绍：\n\n${text}`;
  const content = await caller(systemPrompt, userPrompt, env);
  return { text: content.trim() };
}

export { optimizeResume, analyzeInterview, generateIntroduction };
