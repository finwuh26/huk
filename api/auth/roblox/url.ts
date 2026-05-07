export default function handler(req: any, res: any) {
  if (!process.env.ROBLOX_CLIENT_ID) {
    return res.json({
      alert:
        'OAuth not configured: Missing ROBLOX_CLIENT_ID environment variable. Please configure it in your settings.',
    });
  }
  // OAUTH_REDIRECT_BASE_URL can be set in Vercel env vars to override the default (useful for staging).
  // The redirect URI must be registered in the Roblox OAuth application settings.
  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || 'https://huk.finwuh.uk';
  const redirectUri = `${baseUrl}/auth/roblox/callback`;
  const params = new URLSearchParams({
    client_id: process.env.ROBLOX_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile',
  });
  res.json({ url: `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}` });
}
