import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const config = {
    clientId: process.env.SF_CLIENT_ID ? `${process.env.SF_CLIENT_ID.substring(0, 20)}...` : 'NOT SET',
    hasClientSecret: !!process.env.SF_CLIENT_SECRET,
    redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI || 
      (process.env.NEXT_PUBLIC_APP_URL 
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
        : 'http://localhost:3000/api/auth/callback'),
    loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
    sandboxLoginUrl: process.env.SF_SANDBOX_LOGIN_URL || 'https://test.salesforce.com',
    apiVersion: process.env.API_VERSION || 'v60.0',
    hasSessionPassword: !!process.env.SESSION_PASSWORD && process.env.SESSION_PASSWORD.length >= 32,
  };

  return NextResponse.json({
    status: 'ok',
    config,
    checks: {
      clientIdConfigured: !!process.env.SF_CLIENT_ID,
      clientSecretConfigured: !!process.env.SF_CLIENT_SECRET,
      redirectUriConfigured: true,
      sessionPasswordValid: config.hasSessionPassword,
    },
    expectedCallbackUrl: 'http://localhost:3000/api/auth/callback',
    matchesCallbackUrl: config.redirectUri === 'http://localhost:3000/api/auth/callback',
  });
}
