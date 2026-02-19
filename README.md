# 전세닥터 (RentDoctor) - 전세사기 AI 법률 상담 서비스

한국 전세사기 피해자를 위한 AI 기반 법률 상담 서비스

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | React 19, Vite |
| 백엔드 | Node.js, Express |
| AI 모델 | Google Gemini 2.0 Flash |
| 데이터베이스 | Supabase PostgreSQL (`lawyer` 스키마) |
| DB 클라이언트 | pg (직접 쿼리) |

---

## 프로젝트 구조

```
lawyer/
├── backend/
│   ├── src/
│   │   ├── app.js                    # Express 앱 진입점 (포트 3001)
│   │   ├── db/
│   │   │   ├── pool.js               # pg 커넥션 풀
│   │   │   └── migrate.js            # 테이블 생성 SQL (최초 1회 실행)
│   │   ├── routes/
│   │   │   ├── chat.js               # 채팅 API
│   │   │   ├── diagnosis.js          # 진단 API
│   │   │   └── legal.js              # 법령 조회 API
│   │   ├── services/
│   │   │   ├── aiService.js          # Gemini API 연동 + 스트리밍
│   │   │   ├── ragService.js         # 법령 키워드 검색 (RAG)
│   │   │   └── dbService.js          # DB CRUD (pg 직접)
│   │   ├── data/
│   │   │   ├── laws/                 # 법령 JSON (9개 법령, 114개 조문)
│   │   │   ├── cases/                # 판례 JSON (22건)
│   │   │   └── prompts/              # 시스템 프롬프트
│   │   └── middleware/
│   │       ├── rateLimiter.js        # 요청 제한
│   │       └── errorHandler.js       # 에러 처리
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── HomePage.jsx          # 랜딩 페이지
│       │   ├── ChatPage.jsx          # AI 채팅 페이지
│       │   └── DiagnosticPage.jsx    # 피해 진단 페이지
│       ├── components/
│       │   ├── ChatInterface/        # 스트리밍 채팅 UI
│       │   ├── DiagnosticForm/       # 10개 체크리스트 폼
│       │   ├── Header/               # 네비게이션
│       │   └── LegalInfo/            # 법령 정보 표시
│       ├── hooks/
│       │   ├── useChat.js            # 채팅 상태 관리
│       │   └── useDiagnosis.js       # 진단 상태 관리
│       └── services/
│           └── api.js                # 백엔드 API 통신
└── crawlers/                         # 법령·판례 수집 스크립트 (Playwright)
```

---

## 동작 메커니즘

### 채팅 흐름 (RAG + Streaming)

```
사용자 메시지
      │
      ▼
[ragService] 키워드 매칭
  ├─ 질문에서 단어 추출
  ├─ 법령 JSON → 관련 조문 최대 8개 추출 (조문 전문 600자)
  ├─ 판례 JSON → 유사 판례 최대 3건 추출
  └─ "[관련 법령 및 판례]" 컨텍스트 블록 생성
      │
      ▼
[aiService] Gemini API 호출
  ├─ systemInstruction = 시스템 프롬프트 + RAG 컨텍스트
  ├─ temperature: 0.1 (할루시네이션 억제)
  ├─ 최근 대화 20개 히스토리 포함
  └─ SSE 스트리밍으로 응답 전송
      │
      ▼
프론트엔드 실시간 출력 (타이핑 효과)
      │
      ▼
[dbService] Supabase 비동기 저장 (응답 속도 무영향)
```

### 진단 흐름

```
10개 체크리스트 제출
      │
      ▼
[diagnosis 라우트] 서버 사이드 계산
  ├─ 항목별 가중치 합산 → 0~100점 환산
  ├─ 위험 레벨: 낮음 / 중간 / 높음 / 매우높음
  ├─ 즉각 행동 목록 생성
  └─ 상황에 맞는 지원 기관 선택
      │
      ▼ (useAI=true 옵션 시 추가)
[aiService] Gemini 구조화 분석 (temperature: 0.0)
      │
      ▼
[dbService] 진단 결과 DB 저장
```

### 할루시네이션 방지 (3중 구조)

| 레이어 | 방법 | 효과 |
|--------|------|------|
| 모델 설정 | temperature=0.1, topP=0.85 | 창의적 추측 억제 |
| 시스템 프롬프트 | "제공된 조문만 인용" 명시적 강제 | 임의 조문·판례 번호 생성 방지 |
| RAG 데이터 | 조문 전문 600자 충분히 제공 | 추측 필요성 자체를 제거 |

---

## 보유 법령·판례 데이터

| 법령 | 조문 수 |
|------|---------|
| 주택임대차보호법 | 25개 |
| 전세사기특별법 | 25개 |
| 주택임대차보호법 시행령 | 31개 |
| 임차권등기명령 절차 규칙 | 18개 |
| 전세사기 대응 실무 가이드 | 10개 |
| 형법 (사기죄) | 2개 |
| 민사집행법 (경매·배당) | 3개 |
| **판례** | **22건** |

---

## API 엔드포인트

### 채팅
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/chat/stream` | 스트리밍 채팅 (SSE) |
| POST | `/api/chat` | 일반 채팅 |
| GET | `/api/chat/session/:id` | 대화 히스토리 조회 |
| DELETE | `/api/chat/session/:id` | 세션 삭제 |

### 진단
| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/diagnosis` | 피해 위험도 진단 |
| GET | `/api/diagnosis/checklist` | 체크리스트 항목 조회 |

### 법령
| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/legal/laws` | 보유 법령 목록 |
| GET | `/api/legal/laws/:id` | 특정 법령 조문 |
| GET | `/api/legal/search?q=` | 키워드 검색 |

---

## DB 스키마 (`lawyer`)

```sql
lawyer.sessions    -- 채팅 세션 (id UUID, created_at, updated_at)
lawyer.messages    -- 메시지 (session_id, role, content)
lawyer.diagnoses   -- 진단 결과 (checks JSON, risk_level, risk_score, result JSON)
```

---

## Rate Limiting

| API | 제한 |
|-----|------|
| 일반 | 분당 60회 |
| 채팅 | 분당 10회 |
| 진단 | 분당 5회 |

---

## 소액임차인 최우선변제 기준 (2024년)

| 지역 | 보증금 상한 | 최우선변제액 |
|------|------------|------------|
| 서울 | 1억 6,500만원 이하 | 5,500만원 |
| 수도권 과밀억제권역·세종·용인·화성 | 1억 4,500만원 이하 | 4,800만원 |
| 광역시·안산·광주·파주·이천·평택 | 8,500만원 이하 | 2,800만원 |
| 그 외 지역 | 7,500만원 이하 | 2,500만원 |

---

## 시작 방법

```bash
# 백엔드
cd lawyer/backend
cp .env.example .env      # GEMINI_API_KEY 입력
npm run db:migrate        # 최초 1회 - DB 테이블 생성
npm run dev               # 포트 3001

# 프론트엔드
cd lawyer/frontend
npm run dev               # 포트 5173
```

### 환경변수 (.env)

```env
DATABASE_URL="postgresql://..."   # Supabase 연결 문자열
GEMINI_API_KEY=...                # Google AI Studio에서 발급
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173
```

---

## 주요 지원 기관

| 기관 | 전화 | 내용 |
|------|------|------|
| 대한법률구조공단 | 132 | 무료 법률 상담·소송 |
| 주택도시보증공사(HUG) | 1566-9009 | 전세보증보험 청구 |
| 전세사기피해지원센터 | 1588-0001 | 원스톱 지원 |
| LH 마이홈 | 1600-1004 | 공공임대 지원 |
| 경찰청 | 182 | 형사 고소 |

---

> ⚠️ 본 서비스는 법률 정보 제공 목적의 AI 상담으로, 실제 법적 효력을 갖는 조언이 아닙니다.
> 소송·경매·형사고소 등 중요한 법적 절차는 반드시 **대한법률구조공단(132)** 또는 전문 변호사와 상담하세요.

---

**마지막 업데이트**: 2026-02-18
