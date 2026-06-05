import dns from "dns";
import nodemailer from "nodemailer";

// Prefer IPv4 when resolving SMTP hostnames — some hosts resolve to IPv6
// but the server's network may not have IPv6 outbound connectivity.
dns.setDefaultResultOrder("ipv4first");

interface OtpEmailArgs {
  to: string;
  otp: string;
  quizTitle: string;
  tenantName: string;
}

interface VerificationEmailArgs {
  to: string;
  name: string;
  verifyUrl: string;
  tenantSubdomain: string;
}

const SMTP_CONFIGURED = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

const smtpPort = Number(process.env.SMTP_PORT ?? 465);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: smtpPort,
  // Port 465 uses implicit SSL; all others use STARTTLS
  secure: smtpPort === 465,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendOtpEmail({
  to,
  otp,
  quizTitle,
  tenantName,
}: OtpEmailArgs): Promise<void> {
  if (!SMTP_CONFIGURED) {
    console.log(`\n[DEV EMAIL] OTP for ${to} to take "${quizTitle}": ${otp}\n`);
    return;
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: `Your verification code for ${quizTitle}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="margin-bottom:8px;">Your verification code</h2>
        <p>Use the code below to start <strong>${quizTitle}</strong> on ${tenantName}.</p>
        <div style="margin:24px 0;text-align:center;">
          <span style="display:inline-block;padding:16px 32px;background:#f3f4f6;border-radius:8px;
                       font-size:32px;font-weight:700;letter-spacing:8px;color:#111;">
            ${otp}
          </span>
        </div>
        <p style="color:#6b7280;font-size:13px;">
          This code expires in 10 minutes.<br>
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
  if (info.rejected.length > 0) {
    console.error(`[SMTP] OTP email rejected for recipients: ${JSON.stringify(info.rejected)}`);
  }
}

export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
  tenantSubdomain,
}: VerificationEmailArgs): Promise<void> {
  if (!SMTP_CONFIGURED) {
    // Dev fallback — no SMTP credentials, log the link to console
    console.log(`\n[DEV EMAIL] Verification link for ${to}:\n${verifyUrl}\n`);
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to,
    subject: "Verify your admin account",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
        <h2 style="margin-bottom:8px;">Activate your workspace</h2>
        <p>Hi ${name},</p>
        <p>Your admin account for the <strong>${tenantSubdomain}</strong> workspace has been created.
           Click the button below to verify your email and log in.</p>
        <a href="${verifyUrl}"
           style="display:inline-block;margin:20px 0;padding:12px 28px;background:#4f46e5;
                  color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">
          Verify Email
        </a>
        <p style="color:#6b7280;font-size:13px;">
          This link expires in 24 hours.<br>
          If you did not create this account, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}
