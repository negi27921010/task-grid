import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // nodemailer uses Node.js net/tls — it must not be bundled by webpack.
  // Without this, SMTP connections silently fail in Vercel's serverless env.
  serverExternalPackages: ["nodemailer"],
};

export default nextConfig;
