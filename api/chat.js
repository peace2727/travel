import OpenAI from 'openai'

const json = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

const pick = (v, maxLen = 4000) => {
  if (typeof v !== 'string') return ''
  return v.length > maxLen ? v.slice(0, maxLen) : v
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return json(res, 405, { ok: false, error: 'method_not_allowed' })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return json(res, 500, { ok: false, error: 'missing_openai_key' })

  try {
    const { messages, userEmail, selectedFolderId, selectedDocs } = req.body || {}

    if (!Array.isArray(messages) || messages.length === 0) {
      return json(res, 400, { ok: false, error: 'missing_messages' })
    }

    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

    const system = [
      'You are a helpful assistant for a Google Drive Q&A app.',
      'If you do not have the document contents, ask the user which file/folder to use and what to search for.',
      userEmail ? `User email: ${userEmail}` : null,
      selectedFolderId ? `Selected folder id: ${selectedFolderId}` : null,
      Array.isArray(selectedDocs) && selectedDocs.length
        ? `Selected docs: ${selectedDocs
            .slice(0, 10)
            .map((d) => pick(d?.name, 200))
            .filter(Boolean)
            .join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join('\n')

    const chatMessages = [
      { role: 'system', content: system },
      ...messages.slice(-20).map((m) => ({
        role: m?.role === 'user' ? 'user' : 'assistant',
        content: pick(m?.content, 8000),
      })),
    ]

    const client = new OpenAI({ apiKey })
    const completion = await client.chat.completions.create({
      model,
      messages: chatMessages,
      temperature: 0.2,
    })

    const text = completion?.choices?.[0]?.message?.content || ''
    return json(res, 200, { ok: true, text })
  } catch (err) {
    return json(res, 500, { ok: false, error: 'openai_failed' })
  }
}

