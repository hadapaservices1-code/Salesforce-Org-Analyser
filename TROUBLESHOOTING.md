# Troubleshooting Guide

## Authentication Failed Errors

### Common Issues and Solutions

#### 1. Redirect URI Mismatch (Most Common)

**Error**: `OAuth error: redirect_uri_mismatch`

**Solution**: 
- The redirect URI in your Salesforce Connected App must EXACTLY match: `http://localhost:3000/api/auth/callback`
- In Salesforce Setup → App Manager → Your Connected App → OAuth Settings:
  - Ensure the Callback URL is: `http://localhost:3000/api/auth/callback`
  - No trailing slashes, no differences in case

#### 2. Invalid Client Credentials

**Error**: `invalid_client` or `invalid_client_id`

**Solution**:
- Verify your `.env.local` file has correct values:
  - `SF_CLIENT_ID` - Your Connected App Consumer Key
  - `SF_CLIENT_SECRET` - Your Connected App Consumer Secret
- Restart the dev server after changing environment variables

#### 3. Missing OAuth Scopes

**Error**: `invalid_scope`

**Solution**:
- In Salesforce Connected App, ensure these scopes are selected:
  - `Access and manage your data (api)`
  - `Perform requests on your behalf at any time (refresh_token, offline_access)`

#### 4. Session Password Too Short

**Error**: `SESSION_PASSWORD must be at least 32 characters`

**Solution**:
- Ensure `SESSION_PASSWORD` in `.env.local` is at least 32 characters long
- Use a strong random string

### Debugging Steps

1. **Check Server Logs**:
   - Look at the terminal where `npm run dev` is running
   - Error messages will show the actual Salesforce error

2. **Verify Environment Variables**:
   ```bash
   # Check if variables are loaded
   cat .env.local | grep SF_CLIENT
   ```

3. **Test Auth URL Generation**:
   ```bash
   curl http://localhost:3000/api/auth/login
   ```
   Should return a JSON with `authUrl`

4. **Check Salesforce Connected App**:
   - Go to Setup → App Manager → Your Connected App
   - Verify:
     - Status is "Active"
     - OAuth settings are enabled
     - Callback URL matches exactly
     - Scopes include `api` and `refresh_token`

### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `access_denied` | User denied authorization | User clicked "Deny" - try again |
| `no_code` | No authorization code received | Check redirect URI configuration |
| `auth_failed` | Token exchange failed | Check server logs for details |
| `invalid_client` | Wrong credentials | Verify SF_CLIENT_ID and SF_CLIENT_SECRET |
| `redirect_uri_mismatch` | Callback URL doesn't match | Update Salesforce Connected App |

### Getting Help

If you're still experiencing issues:

1. Check the browser console for client-side errors
2. Check the server terminal for server-side errors
3. Verify your Salesforce Connected App configuration
4. Ensure your `.env.local` file is correct

