import { OAuth2Client } from 'google-auth-library'

const json = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

const getAllowedEmails = () => {
  const raw = process.env.ALLOWED_EMAILS || ''
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { ok: false, error: 'method_not_allowed' })
  }

  try {
    const { idToken } = req.body || {}
    if (!idToken) return json(res, 400, { ok: false, error: 'missing_id_token' })

    const audience =
      process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID
    if (!audience) {
      return json(res, 500, { ok: false, error: 'missing_google_client_id' })
    }

    const client = new OAuth2Client(audience)
    const ticket = await client.verifyIdToken({ idToken, audience })
    const payload = ticket.getPayload()

    const email = (payload?.email || '').toLowerCase()
    const emailVerified = Boolean(payload?.email_verified)

    if (!email || !emailVerified) {
      return json(res, 401, { ok: false, error: 'unverified_email' })
    }

    const allowed = getAllowedEmails()
    if (allowed.length > 0 && !allowed.includes(email)) {
      return json(res, 403, { ok: false, error: 'not_allowed', email })
    }

    return json(res, 200, {
      ok: true,
      email,
      name: payload?.name || null,
      picture: payload?.picture || null,
    })
  } catch (err) {
    return json(res, 401, { ok: false, error: 'invalid_id_token' })
  }
}

