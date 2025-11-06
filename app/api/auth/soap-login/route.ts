import { NextRequest, NextResponse } from 'next/server';
import { loginWithSOAP } from '@/server/salesforce/auth';
import { setSalesforceAuth } from '@/lib/session';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  let username: string | undefined;
  try {
    const body = await request.json();
    username = body.username;
    const { password, securityToken, isSandbox } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    logger.info({ username, isSandbox }, 'SOAP login request received');

    const auth = await loginWithSOAP(
      username,
      password,
      securityToken || '',
      isSandbox === true
    );

    await setSalesforceAuth(auth);
    logger.info({ username }, 'SOAP authentication successful');

    return NextResponse.json({ 
      success: true,
      message: 'Login successful',
      instanceUrl: auth.instanceUrl,
    });
  } catch (error) {
    logger.error({ error, username: username || 'unknown' }, 'SOAP login failed');
    
    // Extract user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Determine error type for appropriate status code and message
    const isCredentialsError = errorMessage.toLowerCase().includes('invalid') || 
                              errorMessage.toLowerCase().includes('credentials') ||
                              errorMessage.toLowerCase().includes('security token');
    
    const isRateLimitError = errorMessage.toLowerCase().includes('request_limit_exceeded') ||
                            errorMessage.toLowerCase().includes('limit exceeded');
    
    // Use 429 (Too Many Requests) for rate limit errors, 401 for credential errors
    const statusCode = isRateLimitError ? 429 : 401;
    
    return NextResponse.json(
      { 
        error: isRateLimitError ? 'API Limit Exceeded' : 'Login failed',
        details: errorMessage,
        message: errorMessage // The error message from loginWithSOAP is already user-friendly
      },
      { status: statusCode }
    );
  }
}
