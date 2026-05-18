import nodemailer from "nodemailer";

interface VerificationEmailArgs {
  to: string;
  name: string;
  verifyUrl: string;
  tenantSubdomain: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendVerificationEmail({
  to,
  name,
  verifyUrl,
  tenantSubdomain,
}: VerificationEmailArgs): Promise<void> {
  if (!process.env.SMTP_USER) {
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
