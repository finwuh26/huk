export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<!DOCTYPE html>
<html>
  <body>
    <script>
      if (window.opener) {
        window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'discord' }, window.location.origin);
        window.close();
      } else {
        window.location.href = '/profile';
      }
    </script>
    <p>Discord authentication successful. This window should close automatically.</p>
  </body>
</html>`);
}
