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

test('chat defaults to agnes-3.0-flash and supports multiline input', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  assert.match(app, /let chatModel = 'agnes-3\.0-flash'/)
  assert.match(html, /<span id="chatModelText">3\.0 Flash<\/span>/)
  assert.match(html, /<textarea class="chat-input" id="chatInput" rows="1"/)
  assert.match(html, /event\.shiftKey && !event\.isComposing/)
  assert.match(app, /function autoResizeChatInput/)
  assert.match(html, /Shift\+Enter 换行/)
  assert.doesNotMatch(app, /agnes-2\.0-flash/)
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

test('image generation defaults to agnes-image-2.5-flash', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  assert.match(app, /let currentModel = 'agnes-image-2\.5-flash'/)
  assert.match(html, /<span id="modelText">Image 2\.5<\/span>/)
  assert.match(html, /param-option active" onclick="selectModel\('agnes-image-2\.5-flash'/)
})

test('image model menu only lists agnes-image-2.5-flash', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  const menuSection = app.slice(
    app.indexOf('const modelMenu = document.getElementById'),
    app.indexOf('// Update ratio menu')
  )
  assert.match(menuSection, /currentModel = 'agnes-image-2\.5-flash'/)
  assert.doesNotMatch(app, /agnes-image-2\.1-flash/)
  assert.doesNotMatch(app, /agnes-image-2\.0-flash/)
  assert.doesNotMatch(html, /agnes-image-2\.1-flash/)
  assert.doesNotMatch(html, /agnes-image-2\.0-flash/)
})

test('generated image payload uses tiered size plus ratio', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const imageSection = app.slice(
    app.indexOf('async function generateImage'),
    app.indexOf('async function generateVideo')
  )
  assert.match(imageSection, /model: currentModel/)
  assert.match(imageSection, /let body = \{ model: currentModel, prompt, size, ratio \}/)
  assert.doesNotMatch(imageSection, /IMAGE_SIZE_MAP/)
  assert.doesNotMatch(imageSection, /agnes-image-2\.[01]-flash/)
})

test('image size tiers and ratios follow the official table', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  assert.match(app, /const IMAGE_SIZE_TIERS = \['1K', '2K', '3K', '4K'\]/)
  assert.match(app, /const DEFAULT_IMAGE_SIZE = '2K'/)
  assert.doesNotMatch(app, /const IMAGE_SIZE_MAP/)
  for (const ratio of ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '21:9']) {
    assert.ok(app.includes(`'${ratio}'`), `missing ratio ${ratio}`)
  }
  // 抽查官方档位输出尺寸
  assert.match(app, /'16:9': \{ '1K': '1312x736',  '2K': '2624x1472'/)
  assert.match(app, /'21:9': \{ '1K': '1568x672',  '2K': '3136x1344'/)
})

test('image size dropdown is hidden for video modes', () => {
  const app = readFileSync(resolve(root, 'app.js'), 'utf8')
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  assert.match(app, /getElementById\('sizeDropdown'\)\.style\.display = isVideo \? 'none' : 'block'/)
  assert.match(html, /<span id="sizeText">2K<\/span>/)
  assert.match(html, /onclick="selectImageSize\('2K'\)"/)
})

test('size and ratio dropdowns share one params row', () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')
  const css = readFileSync(resolve(root, 'styles.css'), 'utf8')
  const paramsRow = html.slice(
    html.indexOf('class="params-row"'),
    html.indexOf('id="durationDropdown"')
  )
  assert.match(paramsRow, /id="sizeDropdown"/)
  assert.match(paramsRow, /id="ratioDropdown"/)
  assert.match(css, /\.control-card \.params-row \{\s*display: grid;/)
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/)
  assert.match(css, /#modelDropdown \{\s*grid-column: 1 \/ -1;/)
})
