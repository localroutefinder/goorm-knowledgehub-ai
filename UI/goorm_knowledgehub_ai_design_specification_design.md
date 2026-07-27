# Goorm KnowledgeHub AI Design System

## 1. Brand Concept: Metallic Pop Art
Goorm KnowledgeHub AI는 기업용 RAG(Retrieval-Augmented Generation) 및 멀티 LLM 오케스트레이션 플랫폼입니다. '엔터프라이즈의 견고함'과 'AI의 혁신성'을 **메탈릭 질감**과 **팝아트적 컬러 대비**를 통해 시각화합니다.

### Design Principles
- **Robust Reliability**: 브러쉬드 실버와 건메탈을 활용한 금속성 질감으로 시스템의 안정성을 표현합니다.
- **Vibrant Innovation**: 네온 퍼플, 사이언 등 강렬한 팝아트 컬러를 포인트로 사용하여 지능적인 에너지를 부여합니다.
- **Precision Logic**: 그리드 기반의 레이아웃과 명확한 타이포그래피 위계로 데이터 중심의 플랫폼 성격을 강조합니다.

---

## 2. Visual Foundation

### Color Palette (Tokens)
- **Surface (Background)**: `#121416` (Deep Gunmetal) - 메인 배경색
- **Surface Bright**: `#37393b` (Brushed Silver) - 카드 및 컴포넌트 표면
- **Primary**: `#6c38ff` (Electric Purple) - 브랜드 주력 컬러 및 강조
- **Secondary**: `#00f0ff` (Neon Cyan) - 액션 버튼 및 긍정적 상태 표시
- **Tertiary**: `#ff386c` (Neon Pink) - 경고 및 오케스트레이션 강조
- **Outline**: `#ffffff1a` - 컴포넌트 경계 및 구분선

### Typography
- **Primary Font**: `Montserrat` (Sans-serif)
- **Styles**:
  - **Display**: Bold, Uppercase, Italic (브랜드 로고 및 주요 타이틀)
  - **Headline**: Medium/Bold (섹션 제목)
  - **Body**: Regular (정보 전달 및 데이터 테이블)
  - **Label (Mono)**: For API logs and code snippets

### Effects & Textures
- **Metallic Gloss**: Chrome/Silver 그라데이션 및 반사 효과
- **Halftone Dot**: 팝아트적 느낌을 주는 망점 패턴 배경
- **Neon Glow**: 인터랙티브 요소 주위의 빛 번짐 효과
- **Heavy Shadows**: `shadow-[4px_4px_0_0_rgba(0,0,0,1)]` (Hard shadow 스타일)

---

## 3. UI Components Strategy

### Navigation
- **SideNavBar**: 고정형(Fixed) 사이드바. 딥 건메탈 배경에 활성화된 탭은 Primary 컬러 바와 그림자로 강조.
- **TopAppBar**: 반투명(Backdrop-blur) 메탈릭 바. 전역 검색 및 프로필 관리.

### Dashboard & Data
- **Metallic Cards**: 둥근 모서리(rounded-sm)와 미세한 베젤(border) 효과를 가진 컨테이너.
- **Status Indicators**: 'Operational', 'Degraded', 'In-Progress' 등은 네온 컬러 배지로 즉각적인 인지 제공.
- **Chart Styles**: 형광색 라인과 그라데이션 필을 사용한 데이터 시각화.

### Chat Interface
- **Message Bubbles**: 사용자(User)는 건메탈 배경, AI는 다크 퍼플 틴트 배경으로 구분.
- **Model Selector**: GPT, Claude, Gemini 등 각 모델 로고와 고유 팝아트 컬러 테두리 적용.

---

## 4. Key Screens Overview
- **Dashboard**: 지식 자산 현황 및 LLM 가동 모니터링.
- **Workspaces**: 부서별 독립된 지식 환경 관리.
- **AI Chat**: 멀티 LLM 기반의 전문 RAG 질의응답.
- **Admin Control**: 시스템 트래픽 및 커널 로그 분석.
- **Settings**: Fallback 우선순위 및 API 연동 설정.
