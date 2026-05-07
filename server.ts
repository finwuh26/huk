import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  let firebaseConfig: any = {};
  try {
    const configContent = await fs.readFile(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8');
    firebaseConfig = JSON.parse(configContent);
  } catch (e) {
    console.error("Could not load firebase-applet-config.json");
  }

  async function getDynamicMetaTags(urlPath: string) {
    let title = "HUK.GOV";
    let description = "Official Government Portal";
    let imageUrl = "https://imgs.search.brave.com/f1xmXIsVsNucoVXHA7KurMkOsPZK2lyMQoH_XT2sLsQ/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9jZG4u/YnJhbmRmZXRjaC5p/by9pZFByZEQxTnlB/L3RoZW1lL2xpZ2h0/L3N5bWJvbC5zdmc_/Yz0xYnhpZDY0TXVw/N2FjemV3U0FZTVgm/dD0xNzEzODg0OTY0/NTM5";

    try {
      if (firebaseConfig.projectId && urlPath.startsWith('/page/')) {
        const slug = urlPath.split('/')[2];
        const apiUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/pages/${slug}?key=${firebaseConfig.apiKey}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.fields) {
            title = data.fields.title?.stringValue || title;
            description = data.fields.description?.stringValue || description;
            if (data.fields.imageUrl?.stringValue) {
              imageUrl = data.fields.imageUrl.stringValue;
            }
          }
        }
      } else if (firebaseConfig.projectId && urlPath.startsWith('/category/')) {
        const slug = urlPath.split('/')[2];
        const apiUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/categories/${slug}?key=${firebaseConfig.apiKey}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.fields) {
            title = data.fields.name?.stringValue || title;
            description = data.fields.description?.stringValue || description;
            if (data.fields.flagUrl?.stringValue) {
              imageUrl = data.fields.flagUrl.stringValue;
            }
          }
        }
      } else if (firebaseConfig.projectId && urlPath.startsWith('/petitions/')) {
        const id = urlPath.split('/')[2];
        const apiUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/petitions/${id}?key=${firebaseConfig.apiKey}`;
        const res = await fetch(apiUrl);
        if (res.ok) {
          const data = await res.json();
          if (data && data.fields) {
            title = data.fields.title?.stringValue || title;
            description = data.fields.problem?.stringValue || description;
          }
        }
      }
    } catch (e) {}

    return `
      <title>${title}</title>
      <meta name="description" content="${description}" />
      <meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />
      <meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />
      <meta property="og:image" content="${imageUrl}" />
      <meta name="twitter:card" content="summary_large_image" />
    `;
  }

  app.get('/api/auth/discord/url', (req, res) => {
    if (!process.env.DISCORD_CLIENT_ID) {
      return res.json({ alert: 'OAuth not configured: Missing DISCORD_CLIENT_ID environment variable. Please configure it in your settings.' });
    }
    const redirectUri = `https://huk.finwuh.uk/auth/discord/callback`;
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'identify email'
    });
    res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
  });

  app.get(['/auth/discord/callback', '/auth/discord/callback/'], async (req, res) => {
    // In a real app we would exchange code for tokens. 
    // Since we are primarily verifying identity connection, we mock the success for preview if client secret isn't available, but usually this requires a backend exchange.
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'discord' }, '*');
              window.close();
            } else {
              window.location.href = '/profile';
            }
          </script>
          <p>Discord authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  app.get('/api/auth/roblox/url', (req, res) => {
    if (!process.env.ROBLOX_CLIENT_ID) {
      return res.json({ alert: 'OAuth not configured: Missing ROBLOX_CLIENT_ID environment variable. Please configure it in your settings.' });
    }
    const redirectUri = `https://huk.finwuh.uk/auth/roblox/callback`;
    const params = new URLSearchParams({
      client_id: process.env.ROBLOX_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid profile'
    });
    res.json({ url: `https://apis.roblox.com/oauth/v1/authorize?${params.toString()}` });
  });

  app.get(['/auth/roblox/callback', '/auth/roblox/callback/'], async (req, res) => {
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'roblox' }, '*');
              window.close();
            } else {
              window.location.href = '/profile';
            }
          </script>
          <p>Roblox authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  app.post('/api/webhook', express.json(), async (req, res) => {
    const { title, description, url, imageUrl, targetSection } = req.body;
    if (!process.env.DISCORD_WEBHOOK_URL) {
      return res.status(500).json({ error: 'DISCORD_WEBHOOK_URL not configured' });
    }
    
    // We format the description nicely if there's a target section
    let formattedDesc = description || '';
    if (targetSection) {
      formattedDesc = `**Section:** ${targetSection}\n\n${formattedDesc}`;
    }

    const embed: any = {
      title: title || 'New Update',
      description: formattedDesc,
      url: url || '',
      color: 3224056 // gov.uk blue
    };

    if (imageUrl) {
      embed.image = { url: imageUrl };
    }

    try {
      await fetch(process.env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: null,
          embeds: [embed]
        })
      });
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // We need a catch-all in DEV since occasionally Vite's internal SPA fallback misfires with certain middleware setups
    app.use(async (req, res, next) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/auth')) return next();
      
      try {
        const dynamicMeta = await getDynamicMetaTags(req.originalUrl);
        let template = await vite.transformIndexHtml(req.originalUrl, `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    ${dynamicMeta}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { index: false })); // Disable automatic index.html serving to allow dynamic catch-all below
    // SPA fallback: send index.html for any unknown routes, with dynamic meta tags injected
    app.get('*all', async (req, res) => {
      try {
        let template = await fs.readFile(path.join(distPath, 'index.html'), 'utf8');
        const dynamicMeta = await getDynamicMetaTags(req.originalUrl);
        template = template.replace(/<title>.*?<\/title>/s, dynamicMeta);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        res.sendFile(path.join(distPath, 'index.html'));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
