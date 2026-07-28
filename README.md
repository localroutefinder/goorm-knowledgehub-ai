# Goorm KnowledgeHub AI

조직·부서 업무 문서를 RAG로 연결하고, GPT / Claude / Gemini / Perplexity를 통합한 **멀티 LLM 지식비서**입니다.

> 우리 조직의 문서를 가장 잘 이해하는 AI 업무 비서

![Dashboard](docs/assets/dashboard.png)

기술명세: [`doc/SPEC Goorm KnowledgeHub AI.md`](doc/SPEC%20Goorm%20KnowledgeHub%20AI.md) (Version **1.3**)

---

## 주요 기능 (현재)

| 기능 | 설명 |
| --- | --- |
| **Neon RAG** | pgvector 검색 → 관련 문서 근거로 답변, Sources 표시 |
| **RAG 하이브리드** | 유사도 게이트로 `docs` / `hybrid` / `web` 분기 |
| **수동 LLM** | GPT / Claude / Gemini / Perplexity 단일 호출 + Fallback |
| **AUTO Deliberate** | 멀티 LLM 병렬 초안 → Chair 합의 → 최종 답변 |
| **답변 웹뷰** | 마크다운 → HTML 웹뷰 (원문 전환) |
| **채팅 세션** | 워크스페이스별 세션 생성/전환/삭제, 좌측 목록·모바일 슬라이드 |
| **Generation 옵션** | Temperature · Max Tokens · System instructions · Web grounding |
| **웹 근거** | Perplexity citations · Gemini Google Search · 선택 Google CSE |
| **API 모델 선택** | `GET /api/models`, `POST /api/chat`의 `model` |
| **사용량** | Neon `usage_logs` → Dashboard / Analytics |
| **UI** | Metallic Pop Art, Stitch 브랜드 로고 |

---

## 스택

- **Web:** React 19, Vite, TypeScript, Tailwind CSS v4, React Router, TanStack Query
- **API:** Express (`server/`), `tsx watch`
- **DB:** Neon PostgreSQL + pgvector
- **LLM:** OpenAI / Anthropic / Google / Perplexity (서버 `.env`만 사용)

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

로그인: **Continue with Google** (현재 mock auth)

---

## 환경 변수

`.env` (서버 전용 키는 Vite에 노출되지 않음)

| 변수 | 용도 |
| --- | --- |
| `OPENAI_API_KEY` | GPT + 임베딩 |
| `ANTHROPIC_API_KEY` | Claude |
| `GOOGLE_API_KEY` | Gemini (+ 선택 CSE) |
| `PERPLEXITY_API_KEY` | 웹 검색·인용 |
| `GOOGLE_CSE_ID` | (선택) Google Custom Search 근거 링크 |
| `DATABASE_URL` | Neon 연결 문자열 |
| `API_PORT` | API 포트 (기본 `8787`) |
| `VITE_FIREBASE_*` | Firebase (미설정 시 mock 로그인) |

상세 템플릿: [`.env.example`](.env.example)

---

## API 요약

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | DB·provider·CSE 상태 |
| `GET` | `/api/models` | 선택 가능 모델·가용 여부 |
| `POST` | `/api/chat` | RAG + LLM + generation 옵션 |
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
  services/    api, chatSessions, auth
server/        Express API
  llm/         providers, deliberate, fallback, webSearch, …
  rag/         chunk, embed, search, seed, index
  usage/       usage_logs, analytics
doc/           기술명세 SPEC (v1.3)
```

---

## 미구현 / 로드맵

- Firebase 실로그인
- 가드레일·의미 캐시
- PDF 바이너리 파싱 고도화
- 채팅 서버 동기화
- 파일 첨부 · 이미지 생성/분석 (OpenAI)
- MCP·메신저·ERP 연동 (SPEC Phase 3)

---

## 라이선스

Private / 내부 프로젝트.
