const nodemailer = require("nodemailer");

const envValue = (name) => {
  const value = process.env[name];
  if (!value) return "";
  return value.trim().replace(/^(['"])(.*)\1$/, "$2").trim();
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const securityEmailHtml = ({ preheader, heading, message, actionLabel, actionUrl }) => `
<!doctype html>
<html lang="en">
  <head>
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;background:#f4f7fb;color:#172033;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f7fb;padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e6ebf2;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="background:#18233a;padding:28px 36px;">
                <div style="color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-.4px;">Expnse<span style="color:#55d6be;">.</span></div>
                <div style="color:#aebbd0;font-size:12px;margin-top:6px;letter-spacing:1.2px;text-transform:uppercase;">Personal finance, made simple</div>
              </td>
            </tr>
            <tr>
              <td style="padding:40px 36px 32px;">
                <div style="display:inline-block;background:#e8faf6;color:#087f6d;border-radius:999px;padding:7px 12px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;">Account security</div>
                <h1 style="color:#172033;font-size:30px;line-height:1.2;margin:20px 0 14px;letter-spacing:-.7px;">${escapeHtml(heading)}</h1>
                <p style="color:#536176;font-size:16px;line-height:1.65;margin:0 0 28px;">${escapeHtml(message)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:10px;background:#18a889;">
                      <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:15px 24px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(actionLabel)} &rarr;</a>
                    </td>
                  </tr>
                </table>
                <p style="color:#7a8799;font-size:13px;line-height:1.6;margin:26px 0 0;">This link expires in one hour and can only be used once.</p>
                <div style="border-top:1px solid #edf0f5;margin:28px 0 22px;"></div>
                <p style="color:#8994a5;font-size:12px;line-height:1.6;margin:0;">If you did not request this email, you can safely ignore it. Your account will remain secure.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#fafbfd;padding:20px 36px;color:#8994a5;font-size:12px;line-height:1.5;">
                &copy; Expnse &middot; Secure account notification
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const smtpHost = envValue("SMTP_HOST");
const smtpPort = Number(envValue("SMTP_PORT"));
const smtpUser = envValue("SMTP_USER");
const smtpPassword = envValue("SMTP_PASSWORD");
const emailFrom = envValue("EMAIL_FROM");
const smtpConfigured = Boolean(
  smtpHost &&
  Number.isInteger(smtpPort) &&
  smtpPort > 0 &&
  smtpUser &&
  smtpPassword &&
  emailFrom,
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: envValue("SMTP_SECURE").toLowerCase() === "true",
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    auth: { user: smtpUser, pass: smtpPassword },
  })
  : null;

const smtpConfigSummary = {
  configured: smtpConfigured,
  host: smtpHost || "<missing>",
  port: Number.isInteger(smtpPort) && smtpPort > 0 ? smtpPort : "<invalid>",
  secure: envValue("SMTP_SECURE").toLowerCase() === "true",
  userConfigured: Boolean(smtpUser),
  passwordConfigured: Boolean(smtpPassword),
  fromConfigured: Boolean(emailFrom),
};

const sendSecurityEmail = async ({ to, subject, text, html }) => {
  if (!transporter) {
    throw new Error("SMTP configuration is incomplete");
  }
  await transporter.sendMail({ from: emailFrom, to, subject, text, html });
  return true;
};

module.exports = { sendSecurityEmail, securityEmailHtml, smtpConfigured, smtpConfigSummary };
