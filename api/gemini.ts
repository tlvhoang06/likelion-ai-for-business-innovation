declare const process: {
  env: Record<string, string | undefined>;
};

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

const ALLOWED_MODELS = new Set(['gemini-2.5-flash', 'gemini-2.0-flash']);

/**
 * Vercel Serverless proxy for Google Gemini generateContent.
 * Keeps GEMINI_API_KEY strictly on the server so it is never bundled into client JS.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const serverKey = (process.env.GEMINI_API_KEY || '').trim();

  if (req.method === 'GET') {
    res.status(200).json({ configured: Boolean(serverKey) });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  if (!serverKey) {
    res.status(503).json({
      error: { message: 'GEMINI_API_KEY is not configured in Vercel environment variables.' },
    });
    return;
  }

  let parsedBody: { model?: unknown; payload?: unknown } = {};
  if (typeof req.body === 'string') {
    try {
      parsedBody = JSON.parse(req.body) as { model?: unknown; payload?: unknown };
    } catch {
      res.status(400).json({ error: { message: 'Invalid JSON request body' } });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    parsedBody = req.body as { model?: unknown; payload?: unknown };
  }

  const model = typeof parsedBody.model === 'string' ? parsedBody.model : 'gemini-2.5-flash';
  if (!ALLOWED_MODELS.has(model)) {
    res.status(400).json({ error: { message: `Unsupported model: ${model}` } });
    return;
  }

  if (!parsedBody.payload || typeof parsedBody.payload !== 'object') {
    res.status(400).json({ error: { message: 'Missing Gemini payload' } });
    return;
  }

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(serverKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedBody.payload),
      }
    );

    const text = await upstream.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = { error: { message: text || `Upstream HTTP ${upstream.status}` } };
    }

    res.status(upstream.status).json(json);
  } catch (err: unknown) {
    res.status(502).json({
      error: {
        message: err instanceof Error ? err.message : 'Failed to reach Google Gemini API',
      },
    });
  }
}
