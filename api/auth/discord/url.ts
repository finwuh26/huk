export default function handler(req: any, res: any) {
  if (!process.env.DISCORD_CLIENT_ID) {
    return res.json({
      alert:
        'OAuth not configured: Missing DISCORD_CLIENT_ID environment variable. Please configure it in your settings.',
    });
  }
  // OAUTH_REDIRECT_BASE_URL can be set in Vercel env vars to override the default (useful for staging).
  // The redirect URI must be registered in the Discord OAuth application settings.
  const baseUrl = process.env.OAUTH_REDIRECT_BASE_URL || 'https://huk.finwuh.uk';
  const redirectUri = `${baseUrl}/auth/discord/callback`;
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
  });
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
}
