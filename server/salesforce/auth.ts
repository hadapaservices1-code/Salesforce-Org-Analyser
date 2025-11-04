import { SalesforceAuth } from '@/lib/types';
import { logger } from '@/lib/logger';

const CLIENT_ID = process.env.SF_CLIENT_ID;
const CLIENT_SECRET = process.env.SF_CLIENT_SECRET;
const LOGIN_URL = process.env.SF_LOGIN_URL || 'https://login.salesforce.com';
const SANDBOX_LOGIN_URL = process.env.SF_SANDBOX_LOGIN_URL || 'https://test.salesforce.com';
const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || 
  (process.env.NEXT_PUBLIC_APP_URL 
    ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`
    : 'http://localhost:3000/api/auth/callback');

export function getAuthUrl(isSandbox: boolean = false): string {
  const baseUrl = isSandbox ? SANDBOX_LOGIN_URL : LOGIN_URL;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID!,
    redirect_uri: REDIRECT_URI,
    scope: 'api refresh_token',
    state: isSandbox ? 'sandbox' : 'production',
  });
  
  return `${baseUrl}/services/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  isSandbox: boolean = false
): Promise<SalesforceAuth> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Salesforce OAuth credentials not configured');
  }

  const baseUrl = isSandbox ? SANDBOX_LOGIN_URL : LOGIN_URL;
  const tokenUrl = `${baseUrl}/services/oauth2/token`;
  
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
  });

  try {
    console.log('Token exchange request:', {
      url: tokenUrl,
      redirectUri: REDIRECT_URI,
      clientId: CLIENT_ID?.substring(0, 20) + '...',
      hasSecret: !!CLIENT_SECRET,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      let errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      const errorMessage = errorData.error_description || errorData.error || errorText;
      console.error('Token exchange failed:', {
        status: response.status,
        error: errorMessage,
        errorData,
        redirectUri: REDIRECT_URI,
        expectedRedirectUri: 'http://localhost:3000/api/auth/callback',
      });
      
      logger.error({ 
        error: errorMessage, 
        status: response.status,
        redirectUri: REDIRECT_URI,
        clientId: CLIENT_ID?.substring(0, 10) + '...',
        errorData,
      }, 'OAuth token exchange failed');
      
      throw new Error(`OAuth error (${response.status}): ${errorMessage}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      throw new Error('No access token received from Salesforce');
    }
    
    return {
      accessToken: data.access_token,
      instanceUrl: data.instance_url,
      refreshToken: data.refresh_token,
    };
  } catch (error) {
    logger.error({ error }, 'Failed to exchange OAuth code');
    throw error;
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  isSandbox: boolean = false
): Promise<SalesforceAuth> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Salesforce OAuth credentials not configured');
  }

  const baseUrl = isSandbox ? SANDBOX_LOGIN_URL : LOGIN_URL;
  const tokenUrl = `${baseUrl}/services/oauth2/token`;
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ error, status: response.status }, 'Token refresh failed');
      throw new Error(`Token refresh error: ${response.status} ${error}`);
    }

    const data = await response.json();
    
    return {
      accessToken: data.access_token,
      instanceUrl: data.instance_url,
      refreshToken: refreshToken, // Keep the original refresh token
    };
  } catch (error) {
    logger.error({ error }, 'Failed to refresh access token');
    throw error;
  }
}
