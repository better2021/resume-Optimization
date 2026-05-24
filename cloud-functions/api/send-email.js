/**
 * EdgeOne Function - POST /api/send-email
 * 文件路径映射：cloud-functions/api/send-email.js → /api/send-email
 */

import { sendEmail } from '../email.js';

async function onRequestPost(context) {
  try {
    const request = context.request;
    const { to, subject, text } = await request.json();
    if (!to) throw new Error('收件人邮箱地址不能为空');
    if (!subject) throw new Error('邮件主题不能为空');
    if (!text) throw new Error('邮件内容不能为空');
    await sendEmail({ to, subject, text, env: context.env });
    return new Response(JSON.stringify({ data: { success: true }, error: null }), {
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
