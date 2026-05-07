export default async function handler(req: any, res: any) {
  const rawCode = (req.query?.code as string) || '';
  const code = rawCode.replace(/[^a-zA-Z0-9_\-]/g, '');
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/auth/discord/callback`;

  let discordId = '';
  let discordUsername = '';

  if (code && process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
    try {
      const tokenBody = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      });
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString()
      });

      if (tokenRes.ok) {
        const tokenJson: any = await tokenRes.json();
        if (tokenJson?.access_token) {
          const meRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` }
          });
          if (meRes.ok) {
            const me: any = await meRes.json();
            discordId = me?.id ? String(me.id) : '';
            discordUsername = me?.global_name || me?.username || '';
          }
        }
      }
    } catch {
      // Best-effort; linking still proceeds even when profile lookup fails.
    }
  }

  const payloadObject = {
    type: 'OAUTH_AUTH_SUCCESS',
    provider: 'discord',
    discordId,
    discordUsername
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payloadObject), 'utf8').toString('base64');
  const profileUrl = `/profile?oauthProvider=discord&discordId=${encodeURIComponent(discordId)}&discordUsername=${encodeURIComponent(discordUsername)}`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html>
<html>
  <body>
    <script>
      if (window.opener) {
        const payload = JSON.parse(atob('${payloadBase64}'));
        window.opener.postMessage(payload, window.location.origin);
        window.close();
      } else {
        window.location.href = '${profileUrl}';
      }
    </script>
    <p>Discord authentication successful. This window should close automatically.</p>
  </body>
</html>`);
}
