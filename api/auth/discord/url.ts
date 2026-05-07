export default function handler(req: any, res: any) {
  if (!process.env.DISCORD_CLIENT_ID) {
    return res.json({
      alert:
        'OAuth not configured: Missing DISCORD_CLIENT_ID environment variable. Please configure it in your settings.',
    });
  }
  const redirectUri = 'https://huk.finwuh.uk/auth/discord/callback';
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
  });
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
}
