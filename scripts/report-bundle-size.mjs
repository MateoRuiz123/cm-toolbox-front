import { createGzip } from 'node:zlib'
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const distAssets = path.join(process.cwd(), 'dist', 'assets')
const reportDir = path.join(process.cwd(), 'reports')
const reportPath = path.join(reportDir, 'bundle-size.txt')

const gzipSize = (buffer) =>
  new Promise((resolve, reject) => {
    const gzip = createGzip()
    const chunks = []
    gzip.on('data', (chunk) => chunks.push(chunk))
    gzip.on('error', reject)
    gzip.on('end', () => resolve(Buffer.concat(chunks).length))
    gzip.end(buffer)
  })

const formatKb = (bytes) => `${(bytes / 1024).toFixed(2)} kB`

const main = async () => {
  const entries = await readdir(distAssets)
  const assetFiles = entries.filter((name) => /\.(js|css)$/.test(name))

  if (assetFiles.length === 0) {
    console.error('No se encontraron assets JS/CSS en dist/assets. Ejecuta pnpm build primero.')
    process.exit(1)
  }

  const rows = []
  for (const file of assetFiles) {
    const fullPath = path.join(distAssets, file)
    const buffer = await readFile(fullPath)
    const raw = buffer.length
    const gzip = await gzipSize(buffer)
    rows.push({ file, raw, gzip, kind: file.endsWith('.css') ? 'css' : 'js' })
  }

  rows.sort((a, b) => b.raw - a.raw)

  const totalJsRaw = rows.filter((r) => r.kind === 'js').reduce((sum, r) => sum + r.raw, 0)
  const totalJsGzip = rows.filter((r) => r.kind === 'js').reduce((sum, r) => sum + r.gzip, 0)
  const totalCssRaw = rows.filter((r) => r.kind === 'css').reduce((sum, r) => sum + r.raw, 0)
  const totalCssGzip = rows.filter((r) => r.kind === 'css').reduce((sum, r) => sum + r.gzip, 0)

  const lines = [
    'Reporte de bundle — cm-toolbox-front',
    `Generado: ${new Date().toISOString()}`,
    '',
    'Archivo'.padEnd(42) + 'Raw'.padStart(12) + 'Gzip'.padStart(12),
    '-'.repeat(66),
    ...rows.map(
      (row) =>
        row.file.padEnd(42) +
        formatKb(row.raw).padStart(12) +
        formatKb(row.gzip).padStart(12),
    ),
    '-'.repeat(66),
    '',
    `Total JS:  ${formatKb(totalJsRaw)} raw / ${formatKb(totalJsGzip)} gzip`,
    `Total CSS: ${formatKb(totalCssRaw)} raw / ${formatKb(totalCssGzip)} gzip`,
    `Total:     ${formatKb(totalJsRaw + totalCssRaw)} raw / ${formatKb(totalJsGzip + totalCssGzip)} gzip`,
    '',
  ]

  await mkdir(reportDir, { recursive: true })
  await writeFile(reportPath, lines.join('\n'), 'utf8')
  console.log(lines.join('\n'))
  console.log(`\nReporte guardado en ${reportPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
