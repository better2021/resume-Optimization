/**
 * 邮件发送模块 - 使用 Nodemailer 发送简历到指定邮箱
 */

const nodemailer = require('nodemailer');

/**
 * 发送邮件
 * @param {string} to - 收件人邮箱
 * @param {string} subject - 邮件主题
 * @param {string} text - 邮件正文（简历内容）
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendEmail({ to, subject, text }) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error('SMTP 未配置，请在 .env 中设置 SMTP_HOST、SMTP_USER、SMTP_PASS');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
}

module.exports = { sendEmail };
