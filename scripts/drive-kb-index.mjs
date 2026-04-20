import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import dotenv from 'dotenv'
import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import * as XLSX from 'xlsx'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

// Load local env files for CLI usage (do not commit secrets)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const nowStamp = () => {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(
    d.getHours(),
  )}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

const safeSlug = (s) =>
  String(s || '')
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 120) || 'untitled'

const mkdirp = async (p) => fs.mkdir(p, { recursive: true })

const fileExists = async (p) => {
  try {
    await fs.stat(p)
    return true
  } catch {
    return false
  }
}

const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'))
const writeJson = async (p, data) =>
  fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8')

const parseArgs = () => {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (!a.startsWith('--')) continue
    const key = a.slice(2)
    const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true
    out[key] = val
  }
  return out
}

const getOAuthClient = async () => {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8787/oauth2callback'

  if (!clientId || !clientSecret) {
    throw new Error(
      'Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment (.env.local).',
    )
  }

  return new OAuth2Client({ clientId, clientSecret, redirectUri })
}

const getAuthedGoogle = async ({ tokenPath }) => {
  const oauth2 = await getOAuthClient()

  if (await fileExists(tokenPath)) {
    oauth2.setCredentials(await readJson(tokenPath))
    return { oauth2, drive: google.drive({ version: 'v3', auth: oauth2 }) }
  }

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline',
    scope: [DRIVE_SCOPE],
    prompt: 'consent',
  })

  // eslint-disable-next-line no-console
  console.log('\nOpen this URL, approve, then paste the code here:\n')
  // eslint-disable-next-line no-console
  console.log(authUrl)
  // eslint-disable-next-line no-console
  console.log('')

  const code = await new Promise((resolve) => {
    process.stdout.write('Code: ')
    process.stdin.resume()
    process.stdin.setEncoding('utf8')
    process.stdin.once('data', (d) => resolve(String(d).trim()))
  })

  const { tokens } = await oauth2.getToken(code)
  oauth2.setCredentials(tokens)
  await mkdirp(path.dirname(tokenPath))
  await writeJson(tokenPath, tokens)

  return { oauth2, drive: google.drive({ version: 'v3', auth: oauth2 }) }
}

const listFolderChildren = async (drive, folderId) => {
  const items = []
  let pageToken = undefined
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields:
        'nextPageToken,files(id,name,mimeType,modifiedTime,size,webViewLink)',
      pageSize: 1000,
      pageToken,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
    items.push(...(res.data.files || []))
    pageToken = res.data.nextPageToken || undefined
  } while (pageToken)
  return items
}

const exportGoogleDocText = async (drive, fileId, mimeType) => {
  // Docs/Sheets/Slides exports via Drive "export" endpoint
  const exportMime =
    mimeType === 'application/vnd.google-apps.document'
      ? 'text/plain'
      : mimeType === 'application/vnd.google-apps.presentation'
        ? 'text/plain'
        : mimeType === 'application/vnd.google-apps.spreadsheet'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : null

  if (!exportMime) return null

  const res = await drive.files.export(
    { fileId, mimeType: exportMime },
    { responseType: 'arraybuffer' },
  )

  return { exportMime, bytes: Buffer.from(res.data) }
}

const downloadBinary = async (drive, fileId) => {
  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' },
  )
  return Buffer.from(res.data)
}

const workbookToMarkdown = (buf) => {
  const wb = XLSX.read(buf, { type: 'buffer' })
  const sections = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false })

    sections.push(`## Sheet: ${sheetName}\n`)
    if (!rows.length) {
      sections.push('_empty sheet_\n')
      continue
    }

    // Render as a simple markdown table (best-effort)
    const head = rows[0] || []
    const body = rows.slice(1, 201) // cap to avoid huge output
    const norm = (r, w) =>
      Array.from({ length: w }, (_, i) => String(r?.[i] ?? '').trim())

    const width = Math.max(
      head.length,
      ...body.map((r) => (Array.isArray(r) ? r.length : 0)),
      1,
    )
    const h = norm(head, width)
    sections.push(`| ${h.join(' | ')} |\n`)
    sections.push(`| ${Array.from({ length: width }, () => '---').join(' | ')} |\n`)
    for (const r of body) {
      const row = norm(r, width)
      sections.push(`| ${row.join(' | ')} |\n`)
    }

    if (rows.length > 201) sections.push('\n_…truncated…_\n')
    sections.push('\n')
  }

  return sections.join('')
}

const writeKbFile = async ({ outDir, relDir, baseName, frontMatter, body }) => {
  const dir = path.join(outDir, relDir)
  await mkdirp(dir)
  const outPath = path.join(dir, `${safeSlug(baseName)}.md`)

  const fmLines = Object.entries(frontMatter)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join('\n')

  const md = `---\n${fmLines}\n---\n\n${body || ''}`
  await fs.writeFile(outPath, md, 'utf8')
  return outPath
}

const main = async () => {
  const args = parseArgs()
  const folderId = String(args.folderId || 'root')
  const outDir = path.resolve(args.outDir || './knowledge/drive')
  const tokenPath = path.resolve(args.tokenPath || './.local/drive-token.json')
  const runId = nowStamp()
  const runOutDir = path.join(outDir, runId)

  await mkdirp(runOutDir)
  const { drive } = await getAuthedGoogle({ tokenPath })

  const queue = [{ folderId, relDir: safeSlug(folderId) }]
  const index = []

  while (queue.length) {
    const cur = queue.shift()
    const children = await listFolderChildren(drive, cur.folderId)

    for (const f of children) {
      const isFolder = f.mimeType === 'application/vnd.google-apps.folder'
      if (isFolder) {
        queue.push({
          folderId: f.id,
          relDir: path.join(cur.relDir, safeSlug(f.name)),
        })
        continue
      }

      const frontMatter = {
        source: 'google-drive',
        fileId: f.id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        webViewLink: f.webViewLink,
        runId,
      }

      let body = `# ${f.name}\n\n`
      body += `- **mimeType**: \`${f.mimeType}\`\n`
      if (f.webViewLink) body += `- **link**: ${f.webViewLink}\n`
      body += '\n'

      try {
        if (String(f.mimeType || '').startsWith('application/vnd.google-apps.')) {
          const exported = await exportGoogleDocText(drive, f.id, f.mimeType)
          if (!exported) {
            body += '_unsupported google-apps type for export_\n'
          } else if (
            exported.exportMime ===
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          ) {
            body += workbookToMarkdown(exported.bytes)
          } else {
            body += exported.bytes.toString('utf8')
          }
        } else if (f.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
          const buf = await downloadBinary(drive, f.id)
          body += workbookToMarkdown(buf)
        } else if (String(f.mimeType || '').startsWith('text/')) {
          const buf = await downloadBinary(drive, f.id)
          body += buf.toString('utf8')
        } else {
          body += '_binary file: content extraction not implemented (stored as metadata + link)_\n'
        }
      } catch (e) {
        body += `\n_error extracting content: ${e?.message || String(e)}_\n`
      }

      const outPath = await writeKbFile({
        outDir: runOutDir,
        relDir: cur.relDir,
        baseName: f.name,
        frontMatter,
        body,
      })

      index.push({
        name: f.name,
        fileId: f.id,
        mimeType: f.mimeType,
        outPath: path.relative(process.cwd(), outPath),
      })
    }
  }

  const indexMd = [
    `# Drive Knowledge Index (${runId})`,
    '',
    `- **rootFolderId**: \`${folderId}\``,
    `- **generatedAt**: \`${new Date().toISOString()}\``,
    '',
    '## Files',
    '',
    ...index.map((it) => `- [${it.name}](${it.outPath.replace(/\\/g, '/')}) (\`${it.mimeType}\`)`),
    '',
  ].join('\n')

  await fs.writeFile(path.join(runOutDir, 'index.md'), indexMd, 'utf8')

  // eslint-disable-next-line no-console
  console.log(`\nDone. Wrote ${index.length} files to:\n${runOutDir}\n`)
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  process.exitCode = 1
})

