import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken } from '@/server/salesforce/auth';
import { setSalesforceAuth } from '@/lib/session';
import { redirect } from 'next/navigation';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const isSandbox = searchParams.get('state') === 'sandbox';

    if (error) {
      const errorMsg = errorDescription 
        ? `${error}: ${errorDescription}` 
        : error;
      console.error('OAuth error:', errorMsg);
      return redirect(`/connect?error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      console.error('No authorization code received');
      return redirect('/connect?error=no_code');
    }

    console.log('Exchanging code for token...', { isSandbox, codeLength: code?.length });
    const auth = await exchangeCodeForToken(code, isSandbox);
    await setSalesforceAuth(auth);
    console.log('Authentication successful');

    return redirect('/dashboard');
  } catch (error) {
    // Next.js redirect() throws NEXT_REDIRECT error - this is expected, don't catch it
    if (error && typeof error === 'object' && 'digest' in error && 
        typeof error.digest === 'string' && error.digest.includes('NEXT_REDIRECT')) {
      throw error; // Re-throw redirect errors
    }
    
    console.error('═══════════════════════════════════════');
    console.error('❌ AUTHENTICATION CALLBACK ERROR');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error Message:', errorMessage);
    console.error('Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('═══════════════════════════════════════');
    
    // Extract specific error type
    let errorParam = 'auth_failed';
    let errorDescription = '';
    
    if (errorMessage.includes('redirect_uri') || errorMessage.includes('redirect_uri_mismatch')) {
      errorParam = 'redirect_uri_mismatch';
      errorDescription = 'Callback URL does not match. Expected: http://localhost:3000/api/auth/callback';
    } else if (errorMessage.includes('invalid_client') || errorMessage.includes('invalid_client_id')) {
      errorParam = 'invalid_client';
      errorDescription = 'Consumer Key or Secret is incorrect';
    } else if (errorMessage.includes('PKCE') || errorMessage.includes('pkce')) {
      errorParam = 'pkce_required';
      errorDescription = 'PKCE is required but not implemented';
    } else if (errorMessage.includes('invalid_grant')) {
      errorParam = 'invalid_grant';
      errorDescription = 'Authorization code is invalid or expired';
    } else {
      errorDescription = errorMessage;
    }
    
    const redirectUrl = `/connect?error=${encodeURIComponent(errorParam)}${errorDescription ? `&error_description=${encodeURIComponent(errorDescription)}` : ''}`;
    console.error('Redirecting to:', redirectUrl);
    
    return redirect(redirectUrl);
  }
}
