/* ===========================
   LifeOS – Secure Groq chat endpoint (Vercel serverless function)
   POST /api/chat
   Body: { messages: [{ role: 'system'|'user'|'assistant', content: string }, ...] }
   Reply: { reply: string }  |  { error: string }
   The API key is read from process.env.GROQ_API_KEY and never leaves the server.
   =========================== */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const MAX_MESSAGES = 30;            // max messages per request
const MAX_MESSAGE_CHARS = 6000;     // max characters per message
const MAX_TOTAL_CHARS = 24000;      // max characters across the whole request
const UPSTREAM_TIMEOUT_MS = 25000;
const ALLOWED_ROLES = ['system', 'user', 'assistant'];

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Request must include a non-empty "messages" array.';
  }
  if (messages.length > MAX_MESSAGES) {
    return `Too many messages (max ${MAX_MESSAGES}).`;
  }
  let total = 0;
  for (const m of messages) {
    if (!m || typeof m !== 'object') return 'Each message must be an object.';
    if (!ALLOWED_ROLES.includes(m.role)) return 'Invalid message role.';
    if (typeof m.content !== 'string' || !m.content.trim()) {
      return 'Each message needs non-empty text content.';
    }
    if (m.content.length > MAX_MESSAGE_CHARS) {
      return `A message is too long (max ${MAX_MESSAGE_CHARS} characters).`;
    }
    total += m.content.length;
  }
  if (total > MAX_TOTAL_CHARS) {
    return 'Conversation is too large. Please clear the chat and try again.';
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'Method not allowed. Use POST.');
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return sendError(
      res,
      500,
      'AI is not configured: GROQ_API_KEY is missing on the server. Add it in Vercel → Settings → Environment Variables and redeploy.'
    );
  }

  // Vercel parses JSON bodies automatically; handle a raw string defensively.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = null; }
  }
  if (!body || typeof body !== 'object') {
    return sendError(res, 400, 'Invalid JSON body.');
  }

  const validationError = validateMessages(body.messages);
  if (validationError) return sendError(res, 400, validationError);

  // Only forward role + content — nothing else from the client.
  const messages = body.messages.map(m => ({ role: m.role, content: m.content }));

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      }),
      signal: controller.signal
    });

    if (!upstream.ok) {
      const errData = await upstream.json().catch(() => ({}));
      const detail = errData?.error?.message || '';
      console.error('Groq error', upstream.status, detail);

      if (upstream.status === 401 || upstream.status === 403) {
        return sendError(res, 502, 'The Groq API key is invalid or not authorized. Check GROQ_API_KEY in Vercel and redeploy.');
      }
      if (upstream.status === 429) {
        return sendError(res, 429, 'Groq rate limit reached. Please wait a moment and try again.');
      }
      if (upstream.status === 400 || upstream.status === 404 || upstream.status === 422) {
        return sendError(res, 502, `Groq rejected the request${detail ? `: ${detail}` : '.'}`);
      }
      return sendError(res, 502, 'Groq is having trouble right now. Please try again shortly.');
    }

    const data = await upstream.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) {
      return sendError(res, 502, 'Groq returned an empty response. Please try again.');
    }
    return res.status(200).json({ reply });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      return sendError(res, 504, 'Groq took too long to respond. Please try again.');
    }
    console.error('Network error calling Groq:', err);
    return sendError(res, 502, 'Could not reach Groq (network error). Please try again.');
  } finally {
    clearTimeout(timer);
  }
};
