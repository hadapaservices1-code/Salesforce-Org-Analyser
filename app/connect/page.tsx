'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

function ConnectForm() {
  const [isSandbox, setIsSandbox] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'oauth' | 'soap'>('oauth');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [securityToken, setSecurityToken] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;
    const errorParam = searchParams.get('error');
    const errorDesc = searchParams.get('error_description');
    
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'access_denied': 'Access was denied. Please try again.',
        'no_code': 'Authorization code not received. Please try again.',
        'auth_failed': 'Authentication failed during token exchange. Check server terminal for details.',
        'invalid_client': 'Invalid client credentials. Verify Consumer Key and Secret in .env.local',
        'redirect_uri_mismatch': 'Callback URL mismatch. Ensure Salesforce callback URL matches exactly: http://localhost:3000/api/auth/callback',
        'pkce_required': 'PKCE is required. Disable PKCE requirement in Salesforce app Security settings.',
        'invalid_grant': 'Invalid authorization code. Code may have expired or was already used.',
      };
      
      const baseMessage = errorMessages[errorParam] || `Error: ${errorParam}`;
      const fullMessage = errorDesc 
        ? `${baseMessage}\n\nDetails: ${decodeURIComponent(errorDesc)}`
        : baseMessage;
      
      setError(fullMessage);
      
      // Don't clear URL immediately - keep error visible
      console.error('Authentication Error:', { errorParam, errorDesc });
    }
  }, [searchParams]);

  const handleOAuthConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/auth/login?sandbox=${isSandbox}`);
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.details || 'Failed to generate auth URL');
        setIsLoading(false);
        return;
      }

      if (data.authUrl) {
        sessionStorage.setItem('isSandbox', String(isSandbox));
        window.location.href = data.authUrl;
      } else {
        setError(data.error || 'Failed to generate auth URL');
        setIsLoading(false);
      }
    } catch (err) {
      setError('Connection failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleSOAPConnect = async () => {
    setIsLoading(true);
    setError(null);

    if (!username || !password) {
      setError('Username and password are required');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/soap-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
          securityToken: securityToken,
          isSandbox,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show user-friendly error message
        const errorMsg = data.message || data.details || data.error || 'Login failed';
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Success - redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Connection failed. Please try again.');
      setIsLoading(false);
    }
  };

  const handleConnect = () => {
    if (loginMethod === 'oauth') {
      handleOAuthConnect();
    } else {
      handleSOAPConnect();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-green-500 to-yellow-500 bg-clip-text text-transparent">
              Org
            </span>
            <span className="text-3xl font-normal text-gray-700 ml-2">Analyzer</span>
          </div>
        </div>

        {/* Card */}
        <div className="google-card">
          <h1 className="text-2xl font-normal text-gray-900 mb-2">
            Connect to Salesforce
          </h1>
          <p className="text-sm text-gray-600 mb-6">
            Authenticate with your Salesforce org to begin analysis
          </p>

          {/* Login Method Toggle */}
          <div className="mb-6">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setLoginMethod('oauth')}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'oauth'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                OAuth (Recommended)
              </button>
              <button
                onClick={() => setLoginMethod('soap')}
                disabled={isLoading}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  loginMethod === 'soap'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Username/Password
              </button>
            </div>
          </div>

          {/* SOAP Login Form */}
          {loginMethod === 'soap' && (
            <div className="mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-email@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Token <span className="text-gray-500 text-xs">(Optional if IP whitelisted)</span>
                </label>
                <input
                  type="text"
                  value={securityToken}
                  onChange={(e) => setSecurityToken(e.target.value)}
                  placeholder="Security token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Get your security token from: Setup → My Personal Information → Reset My Security Token
                </p>
                <p className="mt-1 text-xs text-blue-600">
                  💡 Tip: If your IP address is whitelisted in Salesforce, you may not need a security token.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-lg">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800 mb-1">Authentication Failed</h3>
                  <p className="text-red-700 text-sm whitespace-pre-line">{error}</p>
                  <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-800">
                    <strong>📋 Next Steps:</strong>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Check the terminal running &quot;npm run dev&quot; for detailed error logs</li>
                      <li>Look for &quot;Token exchange failed:&quot; messages</li>
                      <li>Verify Salesforce app settings match the configuration</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isSandbox}
                onChange={(e) => setIsSandbox(e.target.checked)}
                className="sr-only"
                disabled={isLoading}
              />
              <div className="relative">
                <div
                  className={`block w-14 h-8 rounded-full transition-colors ${
                    isSandbox ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                ></div>
                <div
                  className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${
                    isSandbox ? 'transform translate-x-6' : ''
                  }`}
                ></div>
              </div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                Connect to Sandbox
              </span>
            </label>
            <p className="mt-2 text-xs text-gray-500 ml-20">
              {isSandbox
                ? 'Connecting to test.salesforce.com'
                : 'Connecting to login.salesforce.com'}
            </p>
          </div>

          <button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Connecting...' : 'Connect to Salesforce'}
          </button>

          <p className="mt-4 text-xs text-gray-500 text-center">
            {loginMethod === 'oauth' 
              ? 'Your credentials are never stored. We only save access tokens securely in server-side sessions.'
              : 'Your credentials are sent securely and only used for authentication. Session tokens are stored securely.'}
          </p>

          {/* Debug Link - Only show for OAuth */}
          {loginMethod === 'oauth' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/auth/debug');
                    const data = await response.json();
                    console.log('Auth Configuration:', data);
                    alert(`Configuration Check:\n\nClient ID: ${data.config.clientId}\nHas Secret: ${data.config.hasClientSecret}\nRedirect URI: ${data.config.redirectUri}\nMatches Expected: ${data.matchesCallbackUrl ? '✅' : '❌'}`);
                  } catch (err) {
                    console.error('Debug check failed:', err);
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                🔍 Check Configuration
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <div className="flex justify-center space-x-4">
            <a href="#" className="hover:text-gray-700">Privacy</a>
            <a href="#" className="hover:text-gray-700">Terms</a>
            <a href="#" className="hover:text-gray-700">Help</a>
            <a href="#" className="hover:text-gray-700">About</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ConnectForm />
    </Suspense>
  );
}