/**
 * 전세사기특별법 상세 조문 크롤러
 * iframe 내부에서 각 조문 버튼 클릭 후 내용 수집
 */
import { chromium } from 'playwright'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  console.log('전세사기특별법 상세 조문 크롤링...')

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  const page = await browser.newPage()

  // 메인 페이지 접속
  await page.goto('https://www.law.go.kr/법령/전세사기피해자지원및주거안정에관한특별법', {
    waitUntil: 'domcontentloaded', timeout: 30000
  })
  await page.waitForTimeout(3000)

  // iframe URL 가져오기
  const iframeUrl = await page.evaluate(() => document.querySelector('iframe')?.src)
  console.log('iframe URL:', iframeUrl?.slice(0, 80))

  // iframe 직접 접근
  await page.goto(iframeUrl, { waitUntil: 'networkidle', timeout: 30000 })
  await page.waitForTimeout(3000)

  // 전체 텍스트 추출 후 파싱
  const rawText = await page.evaluate(() => document.body.innerText)
  console.log('\n전체 텍스트 일부:')
  console.log(rawText.slice(0, 2000))

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  const articles = []
  let current = null
  let buffer = ''
  let inContent = false

  for (const line of lines) {
    // 조문 번호 패턴
    const match = line.match(/^(제\d+조(?:의\d+)?)(?:\s*[\(（]([^)）]+)[\)）])?\s*(.*)/)

    if (match) {
      if (current && buffer.trim().length > 5) {
        current.content = buffer.trim().replace(/\s+/g, ' ').slice(0, 800)
        articles.push(current)
      }
      current = {
        number: match[1],
        title: match[2] ? match[2].trim() : '',
        rawLine: line
      }
      buffer = match[3] ? match[3].trim() : ''
      inContent = true
    } else if (inContent && current) {
      // 장/절 구분은 건너뜀
      if (/^제\d+장|^제\d+절/.test(line)) continue
      if (buffer.length < 700) {
        buffer += ' ' + line
      }
    }
  }

  if (current && buffer.trim().length > 5) {
    current.content = buffer.trim().replace(/\s+/g, ' ').slice(0, 800)
    articles.push(current)
  }

  console.log(`\n추출된 조문: ${articles.length}개`)
  for (const a of articles.slice(0, 10)) {
    console.log(`  ${a.number} ${a.title}: ${a.content.slice(0, 80)}`)
  }

  await browser.close()

  mkdirSync(join(__dirname, 'output'), { recursive: true })
  writeFileSync(
    join(__dirname, 'output/special-act-articles.json'),
    JSON.stringify({ articles }, null, 2),
    'utf-8'
  )
  console.log('\n저장 완료: output/special-act-articles.json')
}

main().catch(console.error)
