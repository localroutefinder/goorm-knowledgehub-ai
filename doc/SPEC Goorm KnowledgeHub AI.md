# 조직 및 부서별 업무 지원을 위한 RAG & 멀티 LLM 지식비서

## 기술명세서 (Version 1.4)

> **Version 1.4 (2026-07-28)** — Firebase Authentication Google 로그인 (클라이언트), env 미설정 시 mock 폴백.  
> **Version 1.3 (2026-07-28)** — 채팅 세션·목록·슬라이드 히스토리, 엔터프라이즈 Generation 옵션(Temperature / Max Tokens / System instructions), 웹 근거(Google Search·Perplexity citations), `GET /api/models` 반영.  
> **Version 1.2 (2026-07-27)** — RAG 하이브리드 게이트, Auto 멀티 LLM 협의(Deliberation), 답변 웹뷰, 채팅 로컬 영속화, Neon pgvector RAG, 사용량 계측.

---

# 1. 프로젝트 개요

## 프로젝트명

**Goorm KnowledgeHub AI**

> 조직 및 부서별 업무 지원을 위한 RAG & Multi LLM AI Assistant

---

## 프로젝트 목표

기업 또는 공공기관의 부서별 업무 문서를 AI 지식기반(RAG)으로 구축하고,
GPT, Claude, Gemini, Perplexity를 통합한 **멀티 LLM 오케스트레이션 플랫폼**을 통해 업무 담당자가 보다 정확하고 신뢰성 높은 답변을 받을 수 있는 AI 지식비서를 구현한다.

단순한 챗봇이 아니라,

> **"우리 조직의 문서를 가장 잘 이해하는 AI 업무 비서"**

를 목표로 한다.

---

# 2. 주요 활용 대상

* 인사(HR)
* 총무
* 구매
* 영업
* 고객지원
* 품질관리
* 생산관리
* 연구개발
* 법무
* 재무
* 공공기관 행정
* 교육기관

---

# 3. 핵심 가치

기존 ChatGPT의 한계

* 조직 내부 정보를 모름
* 최신 사내 문서를 알지 못함
* 부서 업무 프로세스를 이해하지 못함

↓

본 시스템

* 조직 문서를 기반으로 답변
* 여러 LLM이 협력하여 답변
* 장애 발생 시 자동 대체(Fallback)
* 최신 문서를 지속적으로 반영
* 비용, 품질, 보안을 함께 관리

---

# 4. 주요 기능

## ① 조직 지식기반(RAG)

사용자는 다음 형식의 문서를 업로드할 수 있다.

* PDF
* Markdown (.md)
* TXT

예시

* 업무 매뉴얼
* 취업규칙
* 인사 규정
* FAQ
* 제품 매뉴얼
* 교육자료
* 프로젝트 문서
* 회의록

---

## ② AI 질의응답

예시 질문

> 신입사원 연차 규정을 알려줘.

↓

RAG 검색

↓

관련 문서 추출

↓

LLM 답변 생성

---

## ③ 조직별 Workspace

예시

```text
한일후지코리아

 ├ HR

 ├ Sales

 ├ Engineering

 ├ Purchasing

 ├ Finance
```

Workspace마다

* 독립된 문서
* 독립된 검색
* 독립된 권한
* 독립된 비용 추적

관리 가능

---

## ④ 멀티 LLM 선택

사용자가 원하는 AI를 선택하거나 API로 지정한다.

* GPT
* Claude
* Gemini
* Perplexity
* Auto Mode

API: `GET /api/models`, `POST /api/chat`의 `model` 필드.

---

## ④-B Generation · 근거 제어 (구현)

* Temperature / Max Tokens로 답변 스타일·분량 조절
* System instructions로 조직 톤·형식 지침 주입
* Web grounding으로 검색/인용 URL을 Sources에 표시

---

## ⑤ Auto Mode (멀티 LLM 협의)

사용자는 **"AUTO / Deliberate"** 만 선택하면 된다.

시스템은 다음을 수행한다.

1. RAG 유사도 게이트로 `docs` / `hybrid` / `web` 모드 결정
2. 가용 API 키가 있는 모델(최대 3개: GPT, Claude, Gemini; web 모드 시 Perplexity 포함)에 **병렬 초안** 요청
3. 오케스트레이터가 Chair 모델을 선정
4. Chair가 초안을 비교해 **일치 / 불일치·보완 / 최종답변**을 합성
5. Chat UI에 협의 과정(Round 1 초안 → Round 2 합의)과 최종 답변을 표시

가용 모델이 1개뿐이면 협의 없이 단독 응답한다.  
수동 선택(GPT / Claude / Gemini / Perplexity)은 단일 호출 + Fallback만 사용한다.

---

## ⑥ 모델 라우팅 정책

수동 모드에서는 질문 유형·문서 길이·웹 필요 여부에 따른 휴리스틱/오케스트레이터 분류를 사용할 수 있다.

Auto(협의) 모드에서는 라우팅이 “단일 모델 위임”이 아니라 **참가 모델 집합 구성 + Chair 선정**으로 동작한다.

의도 분류 예:

| intent | 선호 모델 |
| --- | --- |
| policy / reasoning | Claude → GPT → Gemini |
| short_faq | GPT → Gemini → Claude |
| web_news | Perplexity → GPT → Gemini |
| general | Gemini → GPT → Claude |

---

## ⑦ Fallback 전략

기본 모델이 실패하거나 응답 품질이 기준 이하일 경우, 시스템은 사전에 정의된 우선순위에 따라 자동으로 대체 모델로 전환한다.

이때 단순 장애 대응뿐 아니라, 시간 초과, 빈 응답, 형식 오류, 정책 위반 탐지 상황도 Fallback 대상에 포함한다.

기본 Fallback 순서: `GPT → Claude → Gemini → Perplexity` (가용 키만).

---

## ⑧ Response Aggregator (Deliberation)

여러 모델의 초안을 비교·병합해 최종 답변을 생성한다. (구현 모듈: `server/llm/deliberate.ts`)

Round 1 — 동일 RAG 컨텍스트로 병렬 초안  
Round 2 — Chair가 일치/불일치/최종답 합성  

Chat UI는 협의 transcript와 최종 답변을 분리 표시하며, 최종 답변은 **웹뷰(HTML 렌더) / 원문** 전환이 가능하다.

---

## ⑨ 비용 및 사용량 제어

워크스페이스, 부서, 사용자별로 월간 예산 한도를 설정하고, 요청 수와 토큰 사용량을 추적한다.

예산 초과가 예상되면 경고를 띄우고, 필요 시 저비용 모델로 자동 전환하거나 요청을 제한할 수 있다.

**현재 구현:** Neon `usage_logs`에 chat / embed / orchestrate(초안·chair) 기록, Dashboard·Analytics에서 요약 표시.

---

## ⑩ 관측성 및 감사 로그

모든 요청에 대해 사용 모델, 라우팅 사유, 검색된 문서, 응답 시간, 토큰 사용량, 비용 추정치, Fallback 발생 여부를 기록한다.

관리자 화면에서는 팀별 사용량, 비용 추이, 오류율, 지연 시간, 캐시 적중률을 확인할 수 있어야 한다.

---

## ⑪ 가드레일 및 보안 필터

시스템은 민감정보, 개인정보, 금칙어, 프롬프트 인젝션 패턴을 탐지하고 필요 시 마스킹하거나 차단한다.

또한 출력 결과에 대해 내부 규정 위반, 정보 유출, 낮은 신뢰도 응답을 점검하여 안전한 업무 환경을 유지한다.

---

## ⑫ 캐싱 전략

반복되는 질의에 대해서는 의미 기반 또는 요청 기반 캐시를 적용해 응답 속도와 비용을 개선한다.

동일하거나 유사한 질문이 자주 발생하는 업무 환경에서는 캐싱이 체감 성능 향상에 매우 유효하다.

---

## ⑬ RAG 하이브리드 게이트 (구현)

문서 Q&A와 일반/웹 질문을 충돌 없이 처리하기 위해 유사도 게이트를 둔다.

| 조건 | mode | 동작 |
| --- | --- | --- |
| top score ≥ 임계값(기본 0.38) | `docs` | 관련 청크만 주입 + 문서 엄격 프롬프트 |
| top score < 임계값 또는 hit 없음 | `hybrid` | RAG 미주입, 일반 지식 허용(문서 거절 방지) |
| 모델 = Perplexity | `web` | 웹 검색 우선, RAG는 보조 |

시스템 프롬프트는 `docs` / `hybrid` / `web`로 분리된다 (`server/llm/types.ts`).

---

## ⑭ 채팅 세션·히스토리 (구현)

탭 이동·새로고침 시 대화가 유지되도록, **워크스페이스별 대화 세션**을 브라우저 `localStorage`에 저장한다.

### 데이터 모델

```ts
interface ChatSession {
  id: string
  workspaceId: string
  title: string          // 첫 질문 앞 40자 또는 '새 대화'
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}
```

### Storage 키

| 키 | 값 |
| --- | --- |
| `kh_chat_sessions:{workspaceId}` | `ChatSession[]` |
| `kh_chat_active:{workspaceId}` | active session id |

### 동작

- New Chat → 빈 세션 생성 + active 설정 (`AppShell`은 `/chat?new=1`)
- 세션 전환 / 삭제 / 목록(`updatedAt` 내림차순)
- 세션 상한 30개, 세션당 메시지 80개
- 구 키 `kh_chat_history:{ws}`가 있으면 **세션 1개로 마이그레이션** 후 구 키 삭제
- UI: Chat 좌측 세션 패널 (`xl` 미만은 햄버거 슬라이드 오버레이)
- 구현: `src/services/chatSessions.ts`, `src/pages/ChatPage.tsx`
- 서버 DB 동기화는 후속 Phase

---

## ⑮ 엔터프라이즈 Generation 옵션 (구현)

API·Chat·Settings에서 답변 스타일·분량·지침·웹 근거를 제어한다.

| 옵션 | 설명 | 범위 |
| --- | --- | --- |
| `model` | `gpt` / `claude` / `gemini` / `perplexity` / `auto` | API·Chat 칩 |
| `temperature` | 창의성/일관성 (0–2, 기본 0.3) | API·Chat·Settings |
| `maxTokens` | 최대 생성 토큰 (64–8192, 기본 1024) | API·Chat·Settings |
| `systemInstructions` | 추가 System 지침 (베이스 프롬프트에 병합) | API·Chat·Settings |
| `includeWebSearch` | 웹 근거 선호 | API·Chat·Settings |

클라이언트 기본값은 `localStorage` 키 `kh_generation_prefs`에 저장한다 (`AppStore`).

### 답변 근거 (Sources / Citations)

| 출처 | 내용 |
| --- | --- |
| Neon RAG | 문서 filename |
| Perplexity Sonar | 응답 `citations` URL |
| Gemini | Google Search grounding chunk URI (`includeWebSearch` 또는 `web` 모드) |
| Google CSE (선택) | `GOOGLE_API_KEY` + `GOOGLE_CSE_ID` 시 검색 스니펫·링크를 컨텍스트·sources에 주입 |

Chat UI에서 `https://` 출처는 클릭 가능한 링크로 표시한다.

---

# 5. Multi LLM Orchestration

## 지원 모델

| LLM | 주요 역할 |
| --- | --- |
| OpenAI GPT | 범용 업무지원, Tool Calling, 구조화된 출력 |
| Claude | 긴 문서 분석, 정책·규정 해석 |
| Gemini | 멀티모달 분석, Google 생태계 연계 |
| Perplexity | 최신 웹 정보 및 출처 기반 보강 |

---

## Orchestration 구조

```text
사용자 질문
↓
RAG 검색 (Neon pgvector)
↓
유사도 게이트 → docs | hybrid | web
↓
[수동] 선택 모델 호출 + Fallback
[AUTO] Round1 병렬 초안 → Chair 합의 합성
↓
usage_logs 기록
↓
최종 답변 + (AUTO 시) deliberation transcript
↓
Chat UI (웹뷰/원문, sources/링크, routeReason, generation 메타)
```

---

# 5-A. 현재 구현 현황 (Version 1.4)

| 영역 | 상태 | 주요 경로 |
| --- | --- | --- |
| Multi-LLM 호출 | 구현 | `server/llm/providers.ts` |
| Fallback | 구현 | `server/llm/fallback.ts` |
| Auto 협의 | 구현 | `server/llm/deliberate.ts`, `orchestrator.ts` |
| RAG (Neon/pgvector) | 구현 | `server/rag/*`, `server/db.ts` |
| RAG 하이브리드 게이트 | 구현 | `server/rag/search.ts`, `/api/chat` |
| 사용량/Analytics | 구현 | `server/usage/*` |
| 답변 웹뷰 | 구현 | `src/components/ui/AnswerView.tsx` |
| 채팅 세션·히스토리 | 구현 | `src/services/chatSessions.ts`, `ChatPage` |
| Generation 옵션 | 구현 | `temperature` / `maxTokens` / `systemInstructions` |
| 웹 근거·citations | 구현 | Perplexity·Gemini grounding·선택 CSE (`webSearch.ts`) |
| API 모델 목록 | 구현 | `GET /api/models` |
| Firebase Auth (Google) | 구현 (클라이언트) | `src/services/firebase`, `src/services/auth` · env 미설정 시 mock |
| 게스트 채팅 3회 | 구현 | `guest_chat_quota`, `/api/chat/quota`, `/chat` 공개 |
| Firestore 유저 동기화 | 미구현 | 역할·프로필 서버 저장은 후속 |
| 바우처 코드 | 미구현 (CTA만) | 한도 해제용 |
| 가드레일/캐시 | 미구현 | — |
| PDF 바이너리 파싱 | 부분 (텍스트 업로드 중심) | Documents upload |
| 파일 첨부 / 이미지 생성 | 미구현 (이미지 제공자 OpenAI 예정) | — |

### API (현재)

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/health` | DB·provider 키·Google CSE 상태 |
| GET | `/api/models` | 선택 가능 모델·가용 여부·기본 generation 값 |
| GET | `/api/chat/quota` | 게스트 남은 체험 횟수 |
| POST | `/api/chat` | RAG + LLM + generation 옵션 (Auto 시 deliberation, 게스트 3회 한도) |
| POST | `/api/search` | pgvector 검색 |
| GET/POST | `/api/documents`, `/api/documents/upload` | 문서 목록·인덱싱 |
| GET | `/api/usage/summary`, `/api/usage/analytics` | 사용량 |

#### `POST /api/chat` body (구현)

```json
{
  "question": "string",
  "model": "gpt|claude|gemini|perplexity|auto",
  "workspaceId": "ws-hr",
  "temperature": 0.3,
  "maxTokens": 1024,
  "systemInstructions": "optional",
  "includeWebSearch": false
}
```

---

# 6. Fallback 전략

API 장애가 발생해도 서비스가 중단되지 않도록 한다.

기본 모델이 실패하면 사전 정의된 대체 모델로 자동 전환하며, 대체 순서는 관리자 설정으로 조정 가능하다.

또한 응답 시간 초과나 정책 위반도 Fallback 사유로 처리하여 안정성을 높인다.

예시

```text
GPT 실패

↓

Claude 실행

↓

Claude 실패

↓

Gemini 실행

↓

Gemini 실패

↓

Perplexity 실행
```

Fallback 우선순위

```text
GPT

↓

Claude

↓

Gemini

↓

Perplexity
```

또는

관리자가 변경 가능

---

# 7. RAG 처리 구조

```text
문서 업로드

↓

Text Extraction

↓

Chunking

↓

Embedding

↓

Vector DB 저장

↓

질문 입력

↓

권한/Workspace 확인

↓

Similarity Search

↓

Top-K 검색

↓

LLM Prompt 생성

↓

답변 생성
```

---

# 8. 시스템 아키텍처

```text
React + Vite

↓

Firebase Authentication

↓

API Gateway

↓

Policy Engine

↓

RAG Service

↓

Vector Database

↓

LLM Router
 ├ GPT
 ├ Claude
 ├ Gemini
 └ Perplexity

↓

Guardrails

↓

Response Aggregator

↓

최종 답변
```

---

# 9. 권장 기술 스택

## Frontend

* React 19
* Vite
* TypeScript
* Tailwind CSS
* React Router
* TanStack Query

---

## Backend

* Vercel Serverless Functions
* Node.js

---

## Authentication

### Firebase Authentication

지원

* Google Login

향후 확장

* Microsoft Login
* GitHub Login

---

## Database

### Firebase Firestore

저장

* 사용자
* Workspace
* 문서 메타데이터
* 대화 이력
* 사용량 및 비용 로그

---

## Storage

Firebase Storage

저장

* PDF
* TXT
* Markdown

---

## Vector Database

추천 우선순위

1. Supabase + pgvector
2. Neon PostgreSQL + pgvector
3. Pinecone
4. Qdrant

---

## Embedding

추천

* OpenAI Text Embedding
* Gemini Embedding

---

# 10. 디렉터리 구조

```text
src/

 api/

 components/

 pages/

 hooks/

 store/

 services/

   rag/

   auth/

   llm/

   firebase/

 utils/

 types/

 prompts/

api/

 upload.ts

 ask.ts

 search.ts

 router.ts

 fallback.ts

 embeddings.ts
```

---

# 11. Firebase 구조

```text
users/

workspaces/

documents/

chatHistory/

settings/

usageLogs/

routeLogs/
```

---

# 12. Firestore 데이터 모델

## User

```text
id

name

email

photoURL

role

createdAt
```

---

## Workspace

```text
id

organization

department

owner

members

budgetLimit

status
```

---

## Document

```text
id

workspaceId

filename

type

storageUrl

uploadedBy

uploadedAt

accessLevel
```

---

## Chat

```text
question

answer

model

sources

routeReason

latencyMs

createdAt
```

---

## UsageLog

```text
workspaceId

userId

model

tokens

cost

fallbackUsed

createdAt
```

---

# 13. 화면 구성

## 로그인

* Google 로그인 (Firebase Authentication · `signInWithPopup`)
* `VITE_FIREBASE_*` 미설정 시 Demo mock 폴백
* 세션 복원: `onAuthStateChanged`
* Firestore `users/` 프로필 동기화는 후속

---

## Dashboard

* Workspace 선택
* 최근 질문
* 최근 업로드 문서
* 월간 사용량 요약
* 예산 소진 현황

---

## Documents

* PDF 업로드
* Markdown 업로드
* TXT 업로드
* 문서 권한 설정

---

## Chat

좌측

* 세션 목록 (New Chat / 전환 / 삭제)
* `xl` 미만: 햄버거 슬라이드 패널

상단

* GPT / Claude / Gemini / Perplexity / Auto
* Enterprise 패널: Temperature · Max Tokens · Web grounding · System instructions

본문

* 메시지 스레드 (세션별)
* AUTO 시 협의 과정 패널
* 답변 웹뷰 / 원문
* Sources (문서명 또는 웹 URL 링크)

하단

* Prompt 예시 뱃지
* 입력창
* 라우팅 사유 · 지연 시간 · mode

---

## Settings

* API Models (`GET /api/models`)
* Generation Defaults (Temp / Max Tokens / System / Web)
* Fallback 우선순위 UI
* API 키 안내 (실제 키는 서버 `.env`)

---

## 관리자

* 사용자 관리
* Workspace 관리
* 문서 관리
* API 상태 확인
* 로그 확인
* 비용 및 사용량 대시보드
* 보안 위반 탐지 현황

---

# 14. API 설계

### 인증

```text
POST /api/auth/google
```

---

### 문서 업로드

```text
POST /api/documents/upload
```

---

### 문서 검색

```text
POST /api/search
```

---

### 질문

```text
POST /api/chat
Body: question, model, workspaceId?,
      temperature?, maxTokens?, systemInstructions?, includeWebSearch?
```

### 모델 목록

```text
GET /api/models
```

---

### Router

```text
POST /api/router
```

---

### Fallback

```text
POST /api/fallback
```

---

### Workspace

```text
GET /api/workspaces
```

---

# 15. 보안

* Firebase Authentication 기반 Google OAuth
* Workspace별 문서 접근 제어
* API Key는 서버리스 환경변수에서만 관리
* HTTPS 통신
* Firestore Security Rules 적용
* 업로드 파일 형식 및 크기 검증
* 개인정보, 민감정보, 프롬프트 인젝션 탐지 및 차단
* 요청별 감사 로그 및 관리자 추적 기능 제공

---

# 16. 향후 확장

### Phase 2

* Word(.docx), Excel(.xlsx), PowerPoint(.pptx) 지원
* 이미지 OCR 및 스캔 문서 인식
* 음성 회의록 업로드
* 대화 내용 기반 개인 Memory
* Workspace별 프롬프트 템플릿

---

### Phase 3

* MCP(Model Context Protocol) 기반 사내 시스템 연계
* Slack, Microsoft Teams, Google Chat 연동
* Jira, GitHub, Notion, Confluence 연동
* ERP·CRM·그룹웨어 실시간 조회 에이전트
* 승인 프로세스를 포함한 멀티 에이전트 워크플로우

---

# 17. 운영 정책

* 사용자별, 부서별, 워크스페이스별 사용량과 비용 한도를 정의한다.
* 모델 선택은 기본적으로 Auto Mode(협의)를 우선하며, 필요 시 수동 선택을 허용한다.
* 장애 발생 시 Fallback 정책은 자동 적용되며, 관리자만 우선순위를 수정할 수 있다.
* 모든 요청은 감사 로그에 기록되며, 운영자는 품질·비용·보안 관점에서 점검할 수 있다.
* 채팅 UI 기록은 현재 브라우저 로컬에 유지되며, 서버 동기화는 향후 확장한다.

---

# 18. 변경 이력

| Version | 일자 | 요약 |
| --- | --- | --- |
| 1.0 | — | 초기 제품·아키텍처 명세 |
| 1.1 | — | UI/기능 범위 정리 |
| 1.2 | 2026-07-27 | RAG 하이브리드, Auto Deliberation, 웹뷰, 채팅 영속화, Neon RAG·usage 반영 |
| 1.3 | 2026-07-28 | 채팅 세션·슬라이드 히스토리, Generation 옵션, 웹 근거/citations, `/api/models` |
| 1.4 | 2026-07-28 | Firebase Auth Google 로그인 (클라이언트) · mock 폴백 |
| 1.4.1 | 2026-07-28 | 게스트 `/chat` 3회 체험 (`guest_chat_quota`) |
