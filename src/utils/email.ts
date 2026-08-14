import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(toEmail: string, rawToken: string) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;
  const from = process.env.SMTP_FROM || "noreply@talvio.com";

  await transporter.sendMail({
    from,
    to: toEmail,
    subject: "Reset your Talvio password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <h1 style="font-size: 22px; font-weight: 700; color: #5F33E2; margin-bottom: 4px;">Talvio</h1>
        <p style="font-size: 12px; color: #6b7280; margin-top: 0; margin-bottom: 28px;">Employer & Hiring Platform</p>

        <h2 style="font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 8px;">Reset your password</h2>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px; line-height: 1.6;">
          We received a request to reset the password for your Talvio account.
          Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.
        </p>

        <a href="${resetLink}"
           style="display: inline-block; padding: 12px 28px; background: linear-gradient(90deg, #5F33E2 0%, #2563EB 100%);
                  color: #ffffff; text-decoration: none; border-radius: 9999px; font-size: 14px; font-weight: 600;">
          Reset password
        </a>

        <p style="font-size: 13px; color: #9ca3af; margin-top: 28px; line-height: 1.6;">
          If the button doesn't work, copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #5F33E2; word-break: break-all;">${resetLink}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />
        <p style="font-size: 12px; color: #d1d5db; margin: 0;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not be changed.
        </p>
      </div>
    `,
  });
}
