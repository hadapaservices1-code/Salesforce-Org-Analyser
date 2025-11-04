# Debugging Authentication Issues

## Current Issue: Authentication fails after allowing the app

This means:
1. ✅ Authorization code is received (user clicked "Allow")
2. ❌ Token exchange is failing

## Most Common Causes

### 1. PKCE Requirement (Most Likely)
**Problem**: Your Salesforce app has "Require PKCE" enabled, but the code doesn't implement PKCE.

**Solution**: 
- Go to Salesforce → Your External Client App → Security section
- **Uncheck**: "Require Proof Key for Code Exchange (PKCE) extension for Supported Authorization Flows"
- Save

### 2. Redirect URI Mismatch During Token Exchange
**Problem**: The redirect_uri parameter in the token exchange doesn't match exactly.

**Check**: 
- In Salesforce: Callback URL must be exactly `http://localhost:3000/api/auth/callback`
- In code: Uses same URL from `REDIRECT_URI`
- Must match character-for-character

### 3. IP Restrictions Still Active
**Problem**: IP Relaxation might not be saved properly.

**Solution**:
- Go to Salesforce → App Authorization → IP Relaxation
- Change to: **"Relax IP restrictions"**
- Save and verify it's saved

### 4. Client Secret Mismatch
**Problem**: The Consumer Secret in `.env.local` doesn't match Salesforce.

**Check**:
```bash
# Verify your .env.local has the correct secret
cat .env.local | grep SF_CLIENT_SECRET
```

Compare with Salesforce → Consumer Details → Consumer Secret

## How to Debug

1. **Check Server Logs**:
   - Look at the terminal where `npm run dev` is running
   - Look for "Token exchange failed:" messages
   - The error will show the exact Salesforce error

2. **Check Browser Network Tab**:
   - Open DevTools → Network
   - Look for the callback request
   - Check the response for error details

3. **Common Error Messages**:
   - `invalid_grant`: Usually redirect_uri mismatch or expired code
   - `invalid_client`: Wrong Client ID or Secret
   - `invalid_request`: Missing PKCE or other required parameters
   - `redirect_uri_mismatch`: Callback URL doesn't match

## Quick Fix Checklist

- [ ] Disable PKCE requirement in Salesforce
- [ ] Set IP Relaxation to "Relax IP restrictions"
- [ ] Verify Callback URL is exactly `http://localhost:3000/api/auth/callback`
- [ ] Verify Consumer Key matches `SF_CLIENT_ID` in `.env.local`
- [ ] Verify Consumer Secret matches `SF_CLIENT_SECRET` in `.env.local`
- [ ] Restart dev server after changing `.env.local`
- [ ] Clear browser cookies/cache for localhost:3000

