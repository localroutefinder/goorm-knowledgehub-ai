# Goorm KnowledgeHub AI

조직·부서 업무 문서를 RAG로 연결하고, GPT / Claude / Gemini / Perplexity를 통합한 **멀티 LLM 지식비서**입니다.

> 우리 조직의 문서를 가장 잘 이해하는 AI 업무 비서

![Dashboard](docs/assets/dashboard.png)

기술명세: [`doc/SPEC Goorm KnowledgeHub AI.md`](doc/SPEC%20Goorm%20KnowledgeHub%20AI.md) (Version **1.4**)

---

## 주요 기능 (현재)

| 기능 | 설명 |
| --- | --- |
| **Neon RAG** | pgvector 검색 → 관련 문서 근거로 답변, Sources 표시 |
| **RAG 하이브리드** | 유사도 게이트로 `docs` / `hybrid` / `web` 분기 |
| **수동 LLM** | GPT / Claude / Gemini / Perplexity / Local(LM Studio) 단일 호출 + Fallback |
| **AUTO Deliberate** | 멀티 LLM 병렬 초안 → Chair 합의 → 최종 답변 |
| **답변 웹뷰** | 마크다운 → HTML 웹뷰 (원문 전환) |
| **채팅 세션** | 워크스페이스별 세션 생성/전환/삭제, 좌측 목록·모바일 슬라이드 |
| **Generation 옵션** | Temperature · Max Tokens · System instructions · 문서 근거(RAG) · Web grounding |
| **웹 근거** | Perplexity citations · Gemini Google Search · 선택 Google CSE |
| **API 모델 선택** | `GET /api/models`, `POST /api/chat`의 `model` |
| **Google 로그인** | Firebase Auth (`VITE_FIREBASE_*` 미설정 시 mock 폴백) |
| **게스트 체험** | 로그인 없이 `/chat` 최대 3회 (서버 `guest_chat_quota` 강제) |
| **사용량** | Neon `usage_logs` → Dashboard / Analytics |
| **UI** | Metallic Pop Art, Stitch 브랜드 로고 |

---

## 스택

- **Web:** React 19, Vite, TypeScript, Tailwind CSS v4, React Router, TanStack Query
- **API:** Express (`server/`), `tsx watch`
- **Auth:** Firebase Authentication (Google) · env 미설정 시 mock
- **DB:** Neon PostgreSQL + pgvector
- **LLM:** OpenAI / Anthropic / Google / Perplexity / LM Studio local (서버 `.env`만 사용)

---

## 빠른 시작

```bash
npm install
cp .env.example .env   # 키·DATABASE_URL 입력
npm run seed:rag       # Neon에 HR 샘플 문서 임베딩 (선택)
npm run dev
```

| 서비스 | URL |
| --- | --- |
| Web | http://localhost:5173 |
| API | http://localhost:8787 |

Local LLM: LM Studio에서 모델 Load 후 **Local Server**를 켠 뒤 Chat에서 `Local`을 선택합니다. 클라우드 호출이 모두 실패하면 Fallback 마지막에 Local이 시도됩니다 (AUTO 협의에는 포함되지 않음).

로그인: **Continue with Google**
- `VITE_FIREBASE_*` 설정 시 → Firebase Google 팝업 로그인
- 미설정 시 → Demo mock 로그인

### Firebase 콘솔 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 프로젝트 생성
2. Authentication → Sign-in method → **Google** 사용 설정
3. 웹 앱 추가 후 config를 `.env`의 `VITE_FIREBASE_*`에 복사
4. Authentication → Settings → Authorized domains에 `localhost` 포함 확인

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

Vite 재시작 후 http://localhost:5173/login 에서 실로그인을 확인합니다.

로그인 화면 배지가 **Google · Firebase Auth**이면 실로그인 모드입니다. **Mock · Demo Mode**이면 `.env` 6개가 비었거나 Vite를 재시작하지 않은 상태입니다.

| 증상 | 조치 |
| --- | --- |
| `auth/unauthorized-domain` | Firebase Authorized domains에 `localhost`(또는 배포 도메인) 추가 |
| `auth/popup-blocked` | 브라우저 팝업 허용 |
| 팝업 닫힘 | 정상 취소 — 에러 문구 없이 로그인 화면 유지 |
| Google 제공자 오류 | Authentication → Sign-in method에서 Google Enable |

프로젝트: [Firebase Console](https://console.firebase.google.com/project/goorm-multillm-router/authentication) (로컬 `.env`의 `PROJECT_ID` 기준)

---

## 환경 변수

`.env` (서버 전용 키는 Vite에 노출되지 않음)

| 변수 | 용도 |
| --- | --- |
| `OPENAI_API_KEY` | GPT + 임베딩 |
| `ANTHROPIC_API_KEY` | Claude |
| `GOOGLE_API_KEY` | Gemini (+ 선택 CSE) |
| `PERPLEXITY_API_KEY` | 웹 검색·인용 |
| `LMSTUDIO_BASE_URL` | LM Studio OpenAI-compatible base (예: `http://127.0.0.1:1234/v1`) |
| `LMSTUDIO_MODEL` | LM Studio에 로드된 모델 id (예: `qwen2.5-coder-3b-instruct`) |
| `LMSTUDIO_API_KEY` | LM Studio API key (기본 `lm-studio`) |
| `GOOGLE_CSE_ID` | (선택) Google Custom Search 근거 링크 |
| `DATABASE_URL` | Neon 연결 문자열 |
| `API_PORT` | API 포트 (기본 `8787`) |
| `VITE_FIREBASE_API_KEY` 등 | Firebase 웹 앱 config (6개 필수, 미설정 시 mock) |

상세 템플릿: [`.env.example`](.env.example)

---

## API 요약

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | DB·provider·CSE 상태 |
| `GET` | `/api/models` | 선택 가능 모델·가용 여부 |
| `GET` | `/api/chat/quota` | 게스트 남은 횟수 (`X-Guest-Id`) |
| `POST` | `/api/chat` | RAG + LLM + generation 옵션 (+ 게스트 3회 한도) |
| `GET/POST` | `/api/documents` · `/upload` | 문서 목록·인덱싱 |
| `GET` | `/api/usage/summary` · `/analytics` | 사용량 |

### `POST /api/chat` 예시

```json
{
  "question": "신입 연차는?",
  "model": "auto",
  "workspaceId": "ws-hr",
  "temperature": 0.3,
  "maxTokens": 1024,
  "systemInstructions": "불릿으로 답하고 근거를 명시하세요.",
  "includeWebSearch": false
}
```

---

## Auto 협의 흐름

```text
질문
  → Neon RAG 검색
  → score 게이트 (docs | hybrid | web)
  → Round 1: 가용 모델 병렬 초안 (최대 3)
  → Round 2: Chair 합의 (일치 / 불일치 / 최종답변)
  → Chat: 협의 패널 + 웹뷰 최종 답변
```

수동 모델 선택 시에는 협의 없이 단일 호출 + Fallback(`gpt → claude → gemini → perplexity`)만 수행합니다.

---

## RAG 게이트

| top score | mode | 동작 |
| --- | --- | --- |
| ≥ ~0.38 | `docs` | 관련 청크만 주입, 문서 우선 |
| < 임계값 | `hybrid` | 컨텍스트 미주입, 일반 지식 허용 |
| Perplexity 선택 | `web` | 웹 검색 우선 |

---

## 채팅 세션

| 항목 | 내용 |
| --- | --- |
| 저장 | 브라우저 `localStorage` |
| 세션 목록 | `kh_chat_sessions:{workspaceId}` (최대 30) |
| Active | `kh_chat_active:{workspaceId}` |
| 메시지 상한 | 세션당 80 |
| New Chat | AppShell → `/chat?new=1` |
| 마이그레이션 | 구 `kh_chat_history:{ws}` → 세션 1개 |
| UI | 좌측 패널 / 모바일 슬라이드 |

Generation 기본값: `kh_generation_prefs` (Temperature · Max Tokens · System · Web)

### 게스트 체험 (3회)

- `/chat`은 로그인 없이 진입 가능
- 브라우저 `kh_guest_id` + Neon `guest_chat_quota`로 **성공한 채팅만** 최대 3회
- 헤더 `X-Guest-Id` (게스트) / `X-Auth-User` (로그인 시 무제한)
- 한도 초과 시 429 `GUEST_LIMIT` + 로그인/바우처(준비중) CTA
- 바우처 코드 검증은 후속

---

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | API + Vite 동시 실행 |
| `npm run seed:rag` | 샘플 문서 임베딩 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 미리보기 |

---

## 화면

| Route | 페이지 |
| --- | --- |
| `/login` | 로그인 (mock Google) |
| `/` | Dashboard |
| `/workspaces` | Workspaces |
| `/workspaces/:id` | Knowledge Base |
| `/documents` | Documents (업로드·인덱싱) |
| `/chat` | Multi-LLM Chat (세션·Generation) |
| `/analytics` | Analytics / System Pulse |
| `/settings` | Models · Generation · Fallback |

디자인 참고: `UI/` · 로고: `public/brand/goorm-knowledgehub-logo.png`

---

## 디렉터리 (요약)

```text
src/           React 앱 (pages, components, services, store)
  services/    api, chatSessions, auth, firebase
server/        Express API
  llm/         providers, deliberate, fallback, webSearch, …
  rag/         chunk, embed, search, seed, index
  usage/       usage_logs, analytics
doc/           기술명세 SPEC (v1.4)
```

---

## 미구현 / 로드맵

- Firestore 유저 동기화 · 역할 관리
- Express API Firebase ID 토큰 검증
- 바우처 코드 검증 (현재 CTA만)
- 가드레일·의미 캐시
- PDF 바이너리 파싱 고도화
- 채팅 서버 동기화
- 파일 첨부 · 이미지 생성/분석 (OpenAI)
- MCP·메신저·ERP 연동 (SPEC Phase 3)

---

## 라이선스

Private / 내부 프로젝트.
