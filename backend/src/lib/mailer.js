import nodemailer from "nodemailer";

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

let transporter = null;
if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export async function sendOtp(email, otp) {
  const body = `Your CampusConnect verification code is: ${otp}\nExpires in 10 minutes.`;
  if (!transporter) {
    console.log(`[mailer:console] OTP for ${email}: ${otp}`);
    return { deliveredVia: "console" };
  }
  await transporter.sendMail({
    from: SMTP_FROM || "CampusConnect <no-reply@campusconnect.local>",
    to: email,
    subject: "Your CampusConnect verification code",
    text: body,
  });
  return { deliveredVia: "smtp" };
}

export function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}
