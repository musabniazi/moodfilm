/* ============================================================
   FILE: api/gemini.js
   PURPOSE: Vercel Serverless Function.
   This file runs on the SERVER, not in the browser.
   Your Gemini API key lives here as an environment variable —
   completely hidden from users. Nobody can see it.
   The browser calls /api/gemini and this function handles it.
============================================================ */

export default async function handler(req, res) {
  /* Only allow POST requests */
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  /* Read the secret key from Vercel environment variables
     This is set in your Vercel dashboard — never in code */
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const TMDB_KEY   = process.env.TMDB_API_KEY;

  if (!GEMINI_KEY || !TMDB_KEY) {
    return res.status(500).json({ error: 'API keys not configured on server' });
  }

  try {
    const { type, payload } = req.body;

    /* ── GEMINI AI REQUEST ── */
    if (type === 'gemini') {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: payload.prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 1500 }
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({ error: data.error?.message || 'Gemini error' });
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.status(200).json({ text });
    }

    /* ── TMDb SEARCH REQUEST ── */
    if (type === 'tmdb_search') {
      const { title, year } = payload;
      const query  = encodeURIComponent(title);
      const yearQ  = year ? `&year=${year}` : '';
      const url    = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${query}${yearQ}&language=en-US&page=1`;
      const r      = await fetch(url);
      const data   = await r.json();
      return res.status(200).json(data);
    }

    /* ── TMDb DETAIL REQUEST ── */
    if (type === 'tmdb_detail') {
      const { id } = payload;
      const url    = `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_KEY}&language=en-US`;
      const r      = await fetch(url);
      const data   = await r.json();
      return res.status(200).json(data);
    }

    /* ── TMDb TRENDING REQUEST ── */
    if (type === 'tmdb_trending') {
      const url  = `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}&language=en-US`;
      const r    = await fetch(url);
      const data = await r.json();
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Unknown request type' });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
