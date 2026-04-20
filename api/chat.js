import OpenAI from 'openai'
import fs from 'node:fs/promises'
import path from 'node:path'

const json = (res, status, body) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

const pick = (v, maxLen = 4000) => {
  if (typeof v !== 'string') return ''
  return v.length > maxLen ? v.slice(0, maxLen) : v
}

const safeJsonParse = (s) => {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

const getLatestKnowledgeIndexPath = async () => {
  const base =
    process.env.KNOWLEDGE_BASE_DIR ||
    path.join(process.cwd(), 'knowledge', 'drive')

  const entries = await fs.readdir(base, { withFileTypes: true }).catch(() => [])
  const runs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()

  const latest = runs[runs.length - 1]
  if (!latest) return null
  return path.join(base, latest, 'index.md')
}

const extractKeywords = async ({ client, model, question }) => {
  const r = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'keyword_query',
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            keywords: { type: 'array', items: { type: 'string' } },
            must_include: { type: 'array', items: { type: 'string' } },
          },
          required: ['keywords', 'must_include'],
        },
      },
    },
    messages: [
      {
        role: 'system',
        content:
          'Extract Korean search keywords for retrieving relevant travel documents. Keep them short. Include key entities (place, date, currency, product names) when present.',
      },
      { role: 'user', content: question },
    ],
  })

  const content = r?.choices?.[0]?.message?.content || ''
  const parsed = safeJsonParse(content) || { keywords: [], must_include: [] }
  const keywords = [
    // Always include the raw question too (cheap fallback)
    question,
    ...(parsed.keywords || []),
  ]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 10)
  const must = (parsed.must_include || [])
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .slice(0, 3)

  return { keywords, must_include: must }
}

const scoreText = ({ text, keywords, mustInclude }) => {
  const t = String(text || '').toLowerCase()
  let score = 0
  for (const k of keywords) {
    const kk = k.toLowerCase()
    if (!kk) continue
    if (t.includes(kk)) score += 2
  }
  for (const k of mustInclude) {
    const kk = k.toLowerCase()
    if (!kk) continue
    if (t.includes(kk)) score += 10
    else score -= 50
  }
  return score
}

const retrieveFromKnowledge = async ({ question, keywords, mustInclude }) => {
  const indexPath = await getLatestKnowledgeIndexPath()
  if (!indexPath) return { indexPath: null, hits: [] }

  const indexMd = await fs.readFile(indexPath, 'utf8').catch(() => '')
  const lines = indexMd.split(/\r?\n/)
  const links = []
  for (const line of lines) {
    const m = line.match(/^- \[(.+?)\]\((.+?)\) \(`(.+?)`\)/)
    if (!m) continue
    links.push({ name: m[1], relPath: m[2], mimeType: m[3] })
  }

  // First pass: score by filename/path only (cheap)
  const candidates = links
    .map((it) => {
      const score = scoreText({
        text: `${it.name} ${it.relPath}`,
        keywords,
        mustInclude,
      })
      return { ...it, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)

  // Second pass: read top files and score by content too
  const top = []
  for (const c of candidates) {
    const abs = path.join(process.cwd(), c.relPath)
    const content = await fs.readFile(abs, 'utf8').catch(() => '')
    const score = c.score + scoreText({ text: content.slice(0, 20000), keywords, mustInclude })
    top.push({
      ...c,
      score,
      excerpt: content.slice(0, 6000),
    })
  }

  top.sort((a, b) => b.score - a.score)
  const hits = top.filter((h) => h.score > 0).slice(0, 5)

  return { indexPath, hits }
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
    const client = new OpenAI({ apiKey })

    const lastUserMsg = [...messages].reverse().find((m) => m?.role === 'user')
    const question = pick(lastUserMsg?.content, 4000)

    let retrieval = { indexPath: null, hits: [] }
    if (question) {
      const kw = await extractKeywords({ client, model, question })
      retrieval = await retrieveFromKnowledge({
        question,
        keywords: kw.keywords,
        mustInclude: kw.must_include,
      })
    }

    const system = [
      'You are a helpful assistant for a travel knowledge base.',
      'You MUST answer based on the provided "Knowledge hits" excerpts (which come from local Markdown files).',
      'Do NOT ask the user to pick Google Drive folders or files.',
      'If Knowledge hits is "none", say that the information was not found in the current knowledge base and suggest running the monthly indexing job to refresh knowledge.',
      userEmail ? `User email: ${userEmail}` : null,
      selectedFolderId ? `Selected folder id: ${selectedFolderId}` : null,
      Array.isArray(selectedDocs) && selectedDocs.length
        ? `Selected docs: ${selectedDocs
            .slice(0, 10)
            .map((d) => pick(d?.name, 200))
            .filter(Boolean)
            .join(', ')}`
        : null,
      retrieval.hits.length
        ? `Knowledge hits:\n${retrieval.hits
            .map(
              (h, i) =>
                `#${i + 1} name=${h.name} path=${h.relPath}\n${pick(
                  h.excerpt,
                  4000,
                )}`,
            )
            .join('\n\n')}`
        : 'Knowledge hits: none',
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

    const completion = await client.chat.completions.create({
      model,
      messages: chatMessages,
      temperature: 0.2,
    })

    const text = completion?.choices?.[0]?.message?.content || ''
    return json(res, 200, {
      ok: true,
      text,
      debug: process.env.KB_DEBUG === '1'
        ? {
            knowledgeIndex: retrieval.indexPath
              ? path.relative(process.cwd(), retrieval.indexPath)
              : null,
            knowledgeHits: retrieval.hits.map((h) => ({
              name: h.name,
              path: h.relPath,
              score: h.score,
            })),
          }
        : undefined,
    })
  } catch (err) {
    return json(res, 500, { ok: false, error: 'openai_failed' })
  }
}

