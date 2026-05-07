export default function handler(req: any, res: any) {
  // Sanitize code to prevent injection via the URL parameter
  const rawCode = (req.query?.code as string) || '';
  const code = rawCode.replace(/[^a-zA-Z0-9_\-]/g, '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html>
<html>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'roblox', code: '${code}' }, window.location.origin);
        window.close();
      } else {
        window.location.href = '/profile?robloxCode=${code}';
      }
    </script>
    <p>Roblox authentication successful. This window should close automatically.</p>
  </body>
</html>`);
}
