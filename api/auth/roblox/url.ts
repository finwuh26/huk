export default function handler(req: any, res: any) {
  if (!process.env.ROBLOX_CLIENT_ID) {
    return res.json({
      alert:
        'OAuth not configured: Missing ROBLOX_CLIENT_ID environment variable. Please configure it in your settings.',
    });
  }
  const redirectUri = 'https://huk.finwuh.uk/auth/roblox/callback';
  const params = new URLSearchParams({
    client_id: process.env.ROBLOX_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile',
  });
  res.json({ url: `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}` });
}
