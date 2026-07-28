import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const distDir = resolve(root, 'dist')
const staticFiles = ['index.html', 'styles.css', 'app.js', 'robots.txt', 'sitemap.xml']
const staticDirs = ['assets']

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })

for (const file of staticFiles) {
  const source = resolve(root, file)
  if (!existsSync(source)) {
    throw new Error(`Missing source file: ${source}`)
  }

  copyFileSync(source, resolve(distDir, file))
}

for (const dir of staticDirs) {
  const source = resolve(root, dir)
  if (!existsSync(source)) {
    throw new Error(`Missing source directory: ${source}`)
  }

  cpSync(source, resolve(distDir, dir), { recursive: true })
}

copyFileSync(resolve(distDir, 'index.html'), resolve(distDir, '404.html'))

console.log('Built static site:', distDir)
