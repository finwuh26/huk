export default async function handler(req: any, res: any) {
  // Sanitize code to prevent injection via the URL parameter
  const rawCode = (req.query?.code as string) || '';
  const code = rawCode.replace(/[^a-zA-Z0-9_\-]/g, '');
  const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  const redirectUri = `${baseUrl}/auth/roblox/callback`;

  let robloxId = '';
  let robloxUsername = '';

  if (code && process.env.ROBLOX_CLIENT_ID && process.env.ROBLOX_CLIENT_SECRET) {
    try {
      const tokenBody = new URLSearchParams({
        client_id: process.env.ROBLOX_CLIENT_ID,
        client_secret: process.env.ROBLOX_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      });
      const tokenRes = await fetch('https://apis.roblox.com/oauth/v1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString()
      });

      if (tokenRes.ok) {
        const tokenJson: any = await tokenRes.json();
        if (tokenJson?.access_token) {
          const userRes = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
            headers: { Authorization: `Bearer ${tokenJson.access_token}` }
          });
          if (userRes.ok) {
            const me: any = await userRes.json();
            robloxId = me?.sub ? String(me.sub) : '';
            robloxUsername = me?.preferred_username || me?.name || '';
          }
        }
      }
    } catch {
      // Best-effort; linking still proceeds even when profile lookup fails.
    }
  }

  const payloadObject = {
    type: 'OAUTH_AUTH_SUCCESS',
    provider: 'roblox',
    robloxId,
    robloxUsername
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payloadObject), 'utf8').toString('base64');
  const profileUrl = `/profile?oauthProvider=roblox&robloxId=${encodeURIComponent(robloxId)}&robloxUsername=${encodeURIComponent(robloxUsername)}`;

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
    <p>Roblox authentication successful. This window should close automatically.</p>
  </body>
</html>`);
}
