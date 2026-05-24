/**
 * EdgeOne Function - POST /api/send-email
 * 文件路径映射：cloud-functions/api/send-email.js → /api/send-email
 */

const { sendEmail } = require('../email');

async function handleRequest(request) {
  try {
    const { to, subject, text } = await request.json();
    if (!to) throw new Error('收件人邮箱地址不能为空');
    if (!subject) throw new Error('邮件主题不能为空');
    if (!text) throw new Error('邮件内容不能为空');
    await sendEmail({ to, subject, text });
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

module.exports = { handleRequest };
