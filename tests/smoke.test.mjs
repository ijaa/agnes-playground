import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()

test('page html exposes SEO and relative assets', () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')

  assert.match(html, /Agnes Playground/)
  assert.match(html, /免费畅用 Agnes 大模型/)
  assert.match(html, /rel="canonical" href="https:\/\/ijaa\.github\.io\/agnes-playground\/"/)
  assert.match(html, /property="og:title"/)
  assert.match(html, /application\/ld\+json/)
  assert.match(html, /\.\/styles\.css/)
  assert.match(html, /\.\/app\.js/)
  assert.match(html, /\.\/assets\/favicon-32\.png/)
  assert.match(html, /https:\/\/ijaa\.github\.io\/agnes-playground\/assets\/og-cover\.png/)
})

test('core static assets are present', () => {
  assert.ok(existsSync(resolve(root, 'styles.css')))
  assert.ok(existsSync(resolve(root, 'app.js')))
  assert.ok(existsSync(resolve(root, 'assets/agnes-logo.svg')))
  assert.ok(existsSync(resolve(root, 'assets/og-cover.png')))
  assert.ok(existsSync(resolve(root, 'robots.txt')))
  assert.ok(existsSync(resolve(root, 'sitemap.xml')))
})

test('api endpoint uses china domain', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  assert.match(app, /apihub\.agnes-ai\.cn/)
  assert.doesNotMatch(app, /apihub\.agnes-ai\.com/)
})

test('video generation supports agnes-video-2.5-flash model', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  assert.match(app, /agnes-video-2\.5-flash/)
  assert.doesNotMatch(app, /agnes-video-v2\.0/)
  assert.match(app, /model: currentModel/)
})

test('generated video payload uses agnes-video-2.5-flash API params', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const videoSection = app.slice(
    app.indexOf('async function generateVideo'),
    app.indexOf('async function pollVideo')
  )
  assert.match(videoSection, /model: currentModel/)
  assert.match(videoSection, /seconds: selectedSeconds/)
  assert.match(videoSection, /size: '720P'/)
  assert.match(videoSection, /aspect_ratio/)
  assert.match(videoSection, /body\.mode = 'reference'/)
  assert.doesNotMatch(videoSection, /num_frames/)
  assert.doesNotMatch(videoSection, /frame_rate/)
  assert.doesNotMatch(videoSection, /height/)
  assert.doesNotMatch(videoSection, /width/)
})

test('video model menu only lists agnes-video-2.5-flash', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const videoSection = app.slice(
    app.indexOf('function selectType'),
    app.indexOf('let selectedSeconds =')
  )
  assert.match(videoSection, /agnes-video-2\.5-flash/)
  assert.doesNotMatch(videoSection, /agnes-video-v2\.0/)
})

test('video polling includes model_name param', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const pollSection = app.slice(
    app.indexOf('async function pollVideo'),
    app.indexOf('// 生成状态显示')
  )
  assert.match(pollSection, /model_name=\$\{currentModel\}/)
})
