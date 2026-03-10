module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const contentType = String(req.headers['content-type'] || '');

  const readBody = async () => {
    if (req.body && typeof req.body === 'object') return req.body;
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};
    if (contentType.includes('application/json')) {
      try { return JSON.parse(raw); } catch (_) { return {}; }
    }
    if (contentType.includes('application/x-www-form-urlencoded')) {
      return Object.fromEntries(new URLSearchParams(raw));
    }
    return { raw };
  };

  const body = await readBody();
  const email = String((body.email || '')).trim();
  const referrer = String((body.referrer || '')).trim() || '(direct)';

  const xff = String(req.headers['x-forwarded-for'] || '').trim();
  const ip = (xff ? xff.split(',')[0].trim() : '') || String(req.headers['x-real-ip'] || '').trim() || '';

  const city = String(req.headers['x-vercel-ip-city'] || '').trim();
  const region = String(req.headers['x-vercel-ip-country-region'] || '').trim();
  const country = String(req.headers['x-vercel-ip-country'] || '').trim();
  const location = [city, region, country].filter(Boolean).join(', ');

  const origin = `https://${String(req.headers.host || 'getrestock.app')}`;

  if (!email) {
    const wantsHtml = String(req.headers.accept || '').includes('text/html');
    if (wantsHtml) return res.redirect(303, '/?error=1');
    return res.status(400).json({ ok: false, error: 'Missing email' });
  }

  const WAITLIST_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyXiERWSL2YHE8w5Pz91gmVzD3y1QXESkFlh9GHHxLHQxYoUXV2aM7bODTxsN-UlTtI/exec';

  try {
    const params = new URLSearchParams();
    params.set('email', email);
    params.set('ip', ip);
    params.set('location', location);
    params.set('referrer', referrer);
    params.set('origin', origin);

    const r = await fetch(WAITLIST_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: params.toString(),
      redirect: 'follow',
    });

    if (!r.ok) throw new Error(`Upstream error: ${r.status}`);

    const wantsHtml = String(req.headers.accept || '').includes('text/html');
    if (wantsHtml) return res.redirect(303, '/?joined=1');
    return res.status(200).json({ ok: true });
  } catch (e) {
    const wantsHtml = String(req.headers.accept || '').includes('text/html');
    if (wantsHtml) return res.redirect(303, '/?error=1');
    return res.status(500).json({ ok: false, error: 'Submission failed' });
  }
};

