/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    MODE: process.env.MODE,
    SF_LOGIN_URL: process.env.SF_LOGIN_URL,
    SF_SANDBOX_LOGIN_URL: process.env.SF_SANDBOX_LOGIN_URL,
    SF_CLIENT_ID: process.env.SF_CLIENT_ID,
    SF_CLIENT_SECRET: process.env.SF_CLIENT_SECRET,
    API_VERSION: process.env.API_VERSION || 'v60.0',
  },
};

module.exports = nextConfig;
