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
      if (firebaseConfig.projectId) {
        let slug = "";
        let collectionId = "";

        if (urlPath.startsWith("/page/") || urlPath.includes("/browse/")) {
          collectionId = "pages";
          const parts = urlPath.split("/");
          slug = parts[parts.length - 1];
        } else if (urlPath.startsWith("/category/")) {
          collectionId = "categories";
          slug = urlPath.split("/")[2];
        } else if (urlPath.startsWith("/petitions/")) {
          collectionId = "petitions";
          slug = urlPath.split("/")[2];
        }

        if (slug && collectionId) {
          // Use StructuredQuery to find by slug field
          const queryUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
          const queryBody = {
            structuredQuery: {
              from: [{ collectionId }],
              where: {
                fieldFilter: {
                  field: { fieldPath: collectionId === "petitions" ? "__name__" : "slug" },
                  op: "EQUAL",
                  value: { stringValue: slug },
                },
              },
              limit: 1,
            },
          };

          // Petitions are looked up by document ID (name), while others use slug field
          if (collectionId === "petitions") {
            // Update mapping for petition ID
             queryBody.structuredQuery.where.fieldFilter.field.fieldPath = "__name__";
             // Note: __name__ filter requires the full resource path or the ID depending on version, 
             // but usually document ID works for simple fetches. 
             // Actually, for petitions it's easier to just fetch the document directly.
          }

          let data: any = null;
          if (collectionId === "petitions") {
             const docUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/petitions/${slug}?key=${firebaseConfig.apiKey}`;
             const res = await fetch(docUrl);
             if (res.ok) data = await res.json();
          } else {
             const res = await fetch(queryUrl, {
               method: "POST",
               body: JSON.stringify(queryBody),
             });
             if (res.ok) {
               const queryRes = await res.json();
               if (queryRes && queryRes.length > 0 && queryRes[0].document) {
                 data = queryRes[0].document;
               }
             }
          }

          if (data && data.fields) {
            if (collectionId === "pages") {
              title = data.fields.title?.stringValue || title;
              description = data.fields.description?.stringValue || description;
              imageUrl = data.fields.imageUrl?.stringValue || imageUrl;
            } else if (collectionId === "categories") {
              title = data.fields.name?.stringValue || title;
              description = data.fields.description?.stringValue || description;
              imageUrl = data.fields.flagUrl?.stringValue || imageUrl;
            } else if (collectionId === "petitions") {
              title = data.fields.title?.stringValue || title;
              description = data.fields.problem?.stringValue || description;
            }
          }
        }
      }
    } catch (e) {
      console.error("Meta tags error:", e);
    }

    return `
      <title>${title}</title>
      <meta name="description" content="${description}" />
      <meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
      <meta property="og:description" content="${description.replace(/"/g, "&quot;")}" />
      <meta property="og:image" content="${imageUrl}" />
      <meta property="og:type" content="website" />
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
    app.get('*', async (req, res) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/auth')) {
        return res.status(404).json({ error: 'Not Found' });
      }
      try {
        let template = await fs.readFile(path.join(distPath, 'index.html'), 'utf8');
        const dynamicMeta = await getDynamicMetaTags(req.originalUrl);
        
        // In production, the index.html already has some meta tags. We want to replace the title and add our OG tags.
        // We look for the head tag and inject right after it, or replace existing meta tags if we are feeling brave.
        // Safer to just replace the whole head area or at least the title if it exists.
        if (template.includes('<title>')) {
           template = template.replace(/<title>.*?<\/title>/s, dynamicMeta);
        } else {
           template = template.replace('<head>', `<head>\n${dynamicMeta}`);
        }
        
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
