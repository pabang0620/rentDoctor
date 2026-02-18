/**
 * 전세사기특별법 조문 정제
 * - 내용 없는 조문(목록 잔재) 제거
 * - 중복 조문번호 중 내용 많은 것 우선 사용
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const lawsPath = join(__dirname, '../backend/src/data/laws/jeonse-fraud-laws.json')

function descSpecialAct(number, title, content) {
  const map = {
    '제1조': '전세사기피해자를 지원하고 주거안정을 도모하기 위한 특별법의 목적입니다.',
    '제2조': '전세사기피해자, 임대인등, 주택 등 핵심 용어를 정의합니다. 법인 임대인도 포함됩니다.',
    '제3조': '피해자 인정 4대 요건: ①임대인의 기망·편취, ②경공매 진행 중 또는 우려, ③보증금 미반환, ④임차인이 선의·무과실.',
    '제4조': '국가·지방자치단체는 전세사기피해자등 보호를 위한 대책을 수립해야 합니다.',
    '제4조의2': '국토교통부장관은 6개월마다 전세사기 실태조사를 실시합니다.',
    '제5조': '이 법은 다른 법률에 우선하여 적용됩니다.',
    '제6조': '국토교통부에 전세사기피해지원위원회를 설치하여 피해자 결정을 심의합니다.',
    '제7조': '위원의 결격사유를 규정합니다 (피성년후견인 등).',
    '제8조': '위원의 제척·기피·회피를 규정합니다.',
    '제9조': '효율적 심의를 위해 분과위원회를 둘 수 있습니다.',
    '제10조': '국토교통부에 전세사기피해지원단을 설치합니다.',
    '제11조': '전세피해지원센터에서 법률상담, 심리지원, 복지연계 등 원스톱 서비스를 제공합니다.',
    '제12조': '피해자 인정을 받으려면 국토교통부장관에게 신청해야 합니다.',
    '제13조': '국토교통부장관은 피해사실 조사를 합니다 (임차주택 가격, 피해현황 등).',
    '제14조': '전세사기피해자등 결정 기준과 절차를 규정합니다. 우선지원대상자 포함.',
    '제14조의2': '전세사기피해자로 결정 후 요건 변동 시 재심의 규정입니다.',
    '제15조': '결정에 이의가 있는 경우 30일 이내에 이의신청 가능합니다.',
    '제15조의2': '전세사기피해자등 결정의 유효기간 연장에 관한 규정입니다.',
    '제16조': '정보체계 구축 및 운영, 유관기관 정보 연계에 관한 규정입니다.',
    '제17조': '경매·공매 절차를 일시 유예·정지시킬 수 있습니다. 피해자의 거주권 보호.',
    '제18조': '국세 체납으로 인한 공매 시 피해자 보호 특례를 부여합니다.',
    '제19조': '지방세 체납으로 인한 공매 시 피해자 보호 특례를 부여합니다.',
    '제20조': '경매 절차에서 피해자는 최고가 낙찰가로 본인 주택을 우선 매수할 수 있습니다.',
    '제21조': '국세징수법에 따른 공매에서도 우선매수권을 부여합니다.',
    '제22조': '지방세징수법에 따른 공매에서도 우선매수권을 부여합니다.',
    '제23조': '국세 우선징수 특례 - 피해자 보증금 보호.',
    '제24조': '지방세 우선징수 특례 - 피해자 보증금 보호.',
    '제25조': 'LH 등 공공주택사업자가 경공매로 주택 취득 후 피해자에게 공공임대로 제공합니다.',
    '제25조의2': '공공임대주택 입주자격 완화 특례를 부여합니다.',
    '제25조의3': '공공주택사업자의 임시거소 제공에 관한 규정입니다.',
    '제25조의4': '공공주택사업자의 주택 매입 또는 임대에 관한 규정입니다.',
    '제25조의5': '공공주택사업자의 자금 지원에 관한 규정입니다.',
    '제25조의6': '건축법 특례 (임시거소 제공 관련)입니다.',
    '제25조의7': '주택임대차보호법 적용 특례 규정입니다.',
    '제25조의8': '전세사기피해주택 임시거소 제공 사업 관련 규정입니다.',
    '제26조': '경매·공매의 감정평가 비용 지원에 관한 규정입니다.',
    '제27조': '저리 대출, 이자 감면, 보증 등 금융지원을 제공합니다.',
    '제28조': '긴급복지지원법에 따른 생계비, 의료비 등 긴급복지지원을 합니다.',
    '제28조의2': '전세사기피해주택 관련 특례 규정입니다.',
    '제28조의3': '공무원 피해자에 대한 특례 (공가 사용 등)입니다.',
    '제29조': '권한·업무의 위임·위탁에 관한 규정입니다.',
    '제29조의2': '관련 자료 협조 요청에 관한 규정입니다.',
    '제30조': '고유식별정보 처리에 관한 규정입니다.',
    '제31조': '업무 종사자의 비밀준수 의무입니다.',
    '제32조': '벌칙 적용 시 공무원 의제 규정입니다.',
    '제33조': '비밀 누설 등 위반 시 형사처벌 규정입니다.',
    '제34조': '과태료 부과 기준을 규정합니다.',
  }
  if (map[number]) return map[number]
  return content.slice(0, 80).trim()
}

async function main() {
  const laws = JSON.parse(readFileSync(lawsPath, 'utf-8'))
  const idx = laws.laws.findIndex(l => l.id === 'jeonse-fraud-special-act')

  if (idx < 0) {
    console.log('전세사기특별법 없음')
    return
  }

  const raw = laws.laws[idx].articles || []
  console.log(`원본 조문 수: ${raw.length}`)

  // 조문번호별로 그룹화 → 내용이 가장 긴 것 선택
  const byNum = new Map()
  for (const a of raw) {
    const content = (a.content || '').trim()
    const existing = byNum.get(a.number)
    // 내용이 없거나 (로 시작하는 것은 낮은 우선순위
    const score = content.startsWith('(') ? 0 : content.length
    const existScore = existing
      ? ((existing.content || '').startsWith('(') ? 0 : (existing.content || '').length)
      : -1
    if (score > existScore) {
      byNum.set(a.number, a)
    }
  }

  // 내용 있는 것만 필터링
  const filtered = [...byNum.values()].filter(a => {
    const content = (a.content || '').trim()
    return content.length > 20 && !content.startsWith('(')
  })

  // 조문번호 순 정렬
  filtered.sort((a, b) => {
    const numA = parseInt(a.number.replace(/[^0-9]/g, '')) || 0
    const numB = parseInt(b.number.replace(/[^0-9]/g, '')) || 0
    return numA - numB
  })

  // description 재생성
  const final = filtered.map(a => ({
    number: a.number,
    title: a.title || '',
    content: a.content.trim().slice(0, 1000),
    description: descSpecialAct(a.number, a.title, a.content)
  }))

  console.log(`정제 후 조문 수: ${final.length}`)
  console.log('\n포함된 조문:')
  for (const a of final) {
    console.log(`  ${a.number} ${a.title} | ${a.content.slice(0, 70)}`)
  }

  // 저장
  laws.laws[idx].articles = final
  laws.laws[idx].crawledAt = new Date().toISOString()
  laws.lastUpdated = new Date().toISOString()
  writeFileSync(lawsPath, JSON.stringify(laws, null, 2), 'utf-8')

  console.log(`\n저장 완료: ${final.length}개 조문`)
}

main().catch(console.error)
