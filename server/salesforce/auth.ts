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

export async function loginWithSOAP(
  username: string,
  password: string,
  securityToken: string = '',
  isSandbox: boolean = false
): Promise<SalesforceAuth> {
  const baseUrl = isSandbox 
    ? (process.env.SF_SANDBOX_LOGIN_URL || 'https://test.salesforce.com')
    : (process.env.SF_LOGIN_URL || 'https://login.salesforce.com');
  
  // Use the latest supported SOAP API version (60.0) or fallback to 59.0
  const apiVersion = process.env.API_VERSION?.replace('v', '') || '60.0';
  const soapUrl = `${baseUrl}/services/Soap/u/${apiVersion}`;
  
  // Combine password and security token if provided
  // Note: If IP is whitelisted, security token is not required
  const fullPassword = securityToken ? `${password}${securityToken}` : password;

  // Escape XML special characters
  const escapeXml = (str: string): string => {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:partner.soap.sforce.com">
  <soapenv:Body>
    <urn:login>
      <urn:username>${escapeXml(username)}</urn:username>
      <urn:password>${escapeXml(fullPassword)}</urn:password>
    </urn:login>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    logger.info({ username, isSandbox, hasSecurityToken: !!securityToken }, 'SOAP login attempt');

    const response = await fetch(soapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=UTF-8',
        'SOAPAction': 'login',
      },
      body: soapBody,
    });

    const xmlText = await response.text();

    // Check for SOAP faults first (SOAP can return 200 OK with faults in body)
    const faultMatch = xmlText.match(/<faultstring[^>]*>(.*?)<\/faultstring>/i);
    if (faultMatch) {
      const errorMessage = faultMatch[1].trim();
      logger.error({ error: errorMessage, status: response.status, xmlText: xmlText.substring(0, 500) }, 'SOAP login fault');
      
      // Provide user-friendly error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('INVALID_LOGIN')) {
        userMessage = 'Invalid username, password, or security token. Please verify your credentials.';
      } else if (errorMessage.includes('LOGIN_MUST_USE_SECURITY_TOKEN')) {
        userMessage = 'Security token is required. Please enter your security token or whitelist your IP address in Salesforce.';
      } else if (errorMessage.includes('INVALID_CREDENTIALS')) {
        userMessage = 'Invalid credentials. Please check your username and password.';
      } else if (errorMessage.includes('REQUEST_LIMIT_EXCEEDED')) {
        userMessage = 'Your Salesforce org has exceeded its API request limit. Please wait a few minutes and try again, or contact your Salesforce administrator to check your org limits.';
      }
      
      throw new Error(userMessage);
    }

    if (!response.ok) {
      const errorMessage = `SOAP login failed: ${response.status} ${response.statusText}`;
      logger.error({ error: errorMessage, status: response.status, xmlText: xmlText.substring(0, 500) }, 'SOAP login HTTP error');
      throw new Error(errorMessage);
    }

    // Parse sessionId from response (handle different namespace variations)
    const sessionIdMatch = xmlText.match(/<sessionId[^>]*>(.*?)<\/sessionId>/i);
    const serverUrlMatch = xmlText.match(/<serverUrl[^>]*>(.*?)<\/serverUrl>/i);
    const userIdMatch = xmlText.match(/<userId[^>]*>(.*?)<\/userId>/i);

    if (!sessionIdMatch || !serverUrlMatch) {
      logger.error({ xmlText: xmlText.substring(0, 1000) }, 'Invalid SOAP response structure');
      throw new Error('Invalid SOAP response: missing sessionId or serverUrl. Please check the server logs for details.');
    }

    const sessionId = sessionIdMatch[1].trim();
    let serverUrl = serverUrlMatch[1].trim();
    
    // Extract base URL from serverUrl (remove /services/Soap/u/XX.X)
    serverUrl = serverUrl.replace(/\/services\/Soap\/u\/\d+\.\d+.*$/, '');

    logger.info({ instanceUrl: serverUrl, username, userId: userIdMatch?.[1]?.trim() }, 'SOAP login successful');

    return {
      accessToken: sessionId,
      instanceUrl: serverUrl,
      refreshToken: undefined, // SOAP doesn't provide refresh token
    };
  } catch (error) {
    logger.error({ error, username, isSandbox }, 'Failed to login with SOAP');
    
    // Re-throw with better error message if it's already an Error
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error(`SOAP login failed: ${String(error)}`);
  }
}
