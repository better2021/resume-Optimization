/**
 * 邮件发送模块 - 使用 Nodemailer 发送简历到指定邮箱
 *
 * nodemailer 在 EdgeOne 运行时可能不可用（依赖 net 模块），
 * 因此采用懒加载，运行时才 require，避免模块初始化阶段崩溃。
 */

let nodemailer = null;

function getNodemailer() {
  if (!nodemailer) {
    try {
      nodemailer = require('nodemailer');
    } catch {
      throw new Error('邮件模块加载失败：当前环境不支持 SMTP（如 EdgeOne），请改用 HTTP API 发送邮件');
    }
  }
  return nodemailer;
}

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

  const nm = getNodemailer();
  const transporter = nm.createTransport({
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
