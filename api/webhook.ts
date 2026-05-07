export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { title, description, url, imageUrl, targetSection } = req.body || {};

  if (!process.env.DISCORD_WEBHOOK_URL) {
    res.status(500).json({ error: 'DISCORD_WEBHOOK_URL not configured' });
    return;
  }

  let formattedDesc = description || '';
  if (targetSection) {
    formattedDesc = `**Section:** ${targetSection}\n\n${formattedDesc}`;
  }

  const embed: any = {
    title: title || 'New Update',
    description: formattedDesc,
    url: url || '',
    color: 3224056,
  };

  if (imageUrl) {
    embed.image = { url: imageUrl };
  }

  try {
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: null, embeds: [embed] }),
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
