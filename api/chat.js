// Vercel Serverless Function — proxy for api.ikyyxd.my.id/ai/gemini
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Gunakan method POST.' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch { return res.status(400).json({ error: 'Body JSON tidak valid.' }); }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Body request tidak valid.' });
  }

  // Supports the existing Nalar AI Gemini-shaped payload and direct { text, sessionsId } payloads.
  let text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text && Array.isArray(body.contents)) {
    const lastUserMessage = [...body.contents].reverse().find(item => item?.role === 'user');
    text = Array.isArray(lastUserMessage?.parts)
      ? lastUserMessage.parts.map(part => typeof part?.text === 'string' ? part.text : '').join('\n').trim()
      : '';
  }
  if (!text) return res.status(400).json({ error: 'Teks prompt tidak boleh kosong.' });
  if (text.length > 20000) return res.status(413).json({ error: 'Teks prompt terlalu panjang.' });

  const sessionsId = typeof body.sessionsId === 'string' && body.sessionsId.trim()
    ? body.sessionsId.trim().slice(0, 120)
    : 'user';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);
    let upstream;
    try {
      const url = new URL('https://api.ikyyxd.my.id/ai/gemini');
      url.searchParams.set('text', text);
      url.searchParams.set('sessionsId', sessionsId);
      upstream = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    const data = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({
        error: data?.message || data?.error || `Layanan AI gagal (HTTP ${upstream.status}).`
      });
    }
    if (!data || data.status !== true || typeof data.result !== 'string') {
      return res.status(502).json({ error: 'Format respons dari API AI tidak sesuai.' });
    }

    // Keep compatibility with the current frontend, which expects Gemini generateContent format.
    return res.status(200).json({
      candidates: [{ content: { role: 'model', parts: [{ text: data.result }] } }],
      sessionId: data.sessionId || sessionsId,
      runtime: data.runtime || null,
      creator: data.creator || null
    });
  } catch (error) {
    const timedOut = error?.name === 'AbortError';
    return res.status(timedOut ? 504 : 502).json({
      error: timedOut ? 'Permintaan AI kehabisan waktu. Coba lagi.' : 'Tidak dapat terhubung ke API AI.'
    });
  }
}
