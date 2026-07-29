import type {
  ChatMessage,
  DashboardStats,
  DocumentItem,
  KernelEvent,
  ModelHealth,
  UsageLog,
  User,
  Workspace,
} from '@/types'

export const mockUser: User = {
  id: 'u1',
  name: 'Vince Park',
  email: 'vince@goorm.io',
  photoURL:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDnXIR9hdR8r68JJ15htIzbTsLMQ7arSeNRCF6b1eog8iVHkYo5hO_SqRLApA1MD_YYrzu4OhBjnghV49l9Mjebc5JmOoxmffRdqqTe7um6LaTVdaWbvP5dM10T2O_H_9PcrBASk_fv3n4ByZdp_-eMzWkxkayBjHr7n_BLjYzS91bWgqhHFGG1nZiNLdo3Htib0suRMn-uV8Dequp-1fYvT-0mvpmc2NiMjeACsGyIK_lZlYJsEtlqOM3m83btlrCj9Qg5Q9w2BC_p',
  role: 'admin',
  createdAt: '2026-01-12T09:00:00Z',
}

export const mockWorkspaces: Workspace[] = [
  {
    id: 'ws-hr',
    organization: '한일후지코리아',
    department: 'HR',
    owner: 'u1',
    members: ['u1', 'u2', 'u3'],
    budgetLimit: 500,
    budgetUsed: 312,
    status: 'operational',
    documentCount: 128,
    description: '인사 규정·연차·급여 정책 지식베이스',
  },
  {
    id: 'ws-sales',
    organization: '한일후지코리아',
    department: 'Sales',
    owner: 'u1',
    members: ['u1', 'u4'],
    budgetLimit: 400,
    budgetUsed: 180,
    status: 'operational',
    documentCount: 86,
    description: '영업 프로세스·제안서·FAQ',
  },
  {
    id: 'ws-eng',
    organization: '한일후지코리아',
    department: 'Engineering',
    owner: 'u1',
    members: ['u1', 'u5', 'u6'],
    budgetLimit: 800,
    budgetUsed: 640,
    status: 'syncing',
    documentCount: 214,
    description: '기술 문서·아키텍처·API 스펙',
  },
  {
    id: 'ws-purchasing',
    organization: '한일후지코리아',
    department: 'Purchasing',
    owner: 'u1',
    members: ['u1', 'u7'],
    budgetLimit: 300,
    budgetUsed: 95,
    status: 'operational',
    documentCount: 54,
    description: '구매 규정·벤더 계약',
  },
  {
    id: 'ws-finance',
    organization: '한일후지코리아',
    department: 'Finance',
    owner: 'u1',
    members: ['u1', 'u8'],
    budgetLimit: 450,
    budgetUsed: 410,
    status: 'degraded',
    documentCount: 97,
    description: '재무 정책·결산·감사 자료',
  },
]

export const mockDocuments: DocumentItem[] = [
  {
    id: 'd1',
    workspaceId: 'ws-hr',
    filename: 'Payroll_Logic_v4.pdf',
    type: 'pdf',
    storageUrl: '#',
    uploadedBy: 'Vince Park',
    uploadedAt: '2026-07-20T10:12:00Z',
    accessLevel: 'workspace',
    status: 'indexed',
    sizeLabel: '2.4 MB',
  },
  {
    id: 'd2',
    workspaceId: 'ws-hr',
    filename: 'HR_Policy_Manual.md',
    type: 'md',
    storageUrl: '#',
    uploadedBy: 'Vince Park',
    uploadedAt: '2026-07-18T14:30:00Z',
    accessLevel: 'restricted',
    status: 'indexed',
    sizeLabel: '180 KB',
  },
  {
    id: 'd3',
    workspaceId: 'ws-hr',
    filename: 'Leave_FAQ.txt',
    type: 'txt',
    storageUrl: '#',
    uploadedBy: 'Kim HR',
    uploadedAt: '2026-07-15T09:00:00Z',
    accessLevel: 'public',
    status: 'syncing',
    sizeLabel: '42 KB',
  },
  {
    id: 'd4',
    workspaceId: 'ws-eng',
    filename: 'API_Gateway_Spec.pdf',
    type: 'pdf',
    storageUrl: '#',
    uploadedBy: 'Dev Lead',
    uploadedAt: '2026-07-22T11:45:00Z',
    accessLevel: 'workspace',
    status: 'indexed',
    sizeLabel: '1.1 MB',
  },
  {
    id: 'd5',
    workspaceId: 'ws-sales',
    filename: 'Sales_Playbook.md',
    type: 'md',
    storageUrl: '#',
    uploadedBy: 'Sales Ops',
    uploadedAt: '2026-07-10T16:20:00Z',
    accessLevel: 'workspace',
    status: 'failed',
    sizeLabel: '96 KB',
  },
]

export const mockChats: ChatMessage[] = [
  {
    id: 'c1',
    role: 'user',
    question:
      '신입사원 연차 규정을 알려줘. 특히 수습 기간 중 연차 발생 기준이 궁금해.',
    model: 'auto',
    sources: [],
    routeReason: 'manual',
    latencyMs: 0,
    createdAt: '2026-07-27T05:02:11Z',
  },
  {
    id: 'c2',
    role: 'assistant',
    answer:
      'HR_Policy_Manual 기준으로 수습 기간(통상 3개월) 중에도 월할 연차가 발생합니다. 입사일 기준 1개월 개근 시 1일이 부여되며, 수습 종료 후 잔여 연차는 정규 규정으로 전환됩니다.',
    model: 'claude',
    sources: ['HR_Policy_Manual.md', 'Leave_FAQ.txt'],
    routeReason: '긴 규정 해석 → Claude 우선',
    latencyMs: 1240,
    createdAt: '2026-07-27T05:02:13Z',
  },
  {
    id: 'c3',
    role: 'user',
    question:
      'Can you analyze the recent payroll changes in the HR Manual? I need the delta between June and July overtime logic.',
    model: 'gpt',
    sources: [],
    routeReason: 'manual',
    latencyMs: 0,
    createdAt: '2026-07-27T05:10:00Z',
  },
  {
    id: 'c4',
    role: 'assistant',
    answer:
      'Payroll_Logic_v4.pdf 기준 Tier 2 오버타임 임계값이 45h → 42.5h로 조정되었고, 주말 배수는 2.5x → 2.2x로 캡이 적용되었습니다.',
    model: 'gpt',
    sources: ['Payroll_Logic_v4.pdf', 'HR_Policy_Manual.md'],
    routeReason: '구조화 비교 → GPT',
    latencyMs: 980,
    createdAt: '2026-07-27T05:10:02Z',
    fallbackUsed: false,
  },
]

export const mockUsageLogs: UsageLog[] = [
  {
    id: 'ul1',
    workspaceId: 'ws-hr',
    userId: 'u1',
    model: 'claude',
    tokens: 4200,
    cost: 0.084,
    fallbackUsed: false,
    createdAt: '2026-07-27T05:02:13Z',
  },
  {
    id: 'ul2',
    workspaceId: 'ws-hr',
    userId: 'u1',
    model: 'gpt',
    tokens: 3100,
    cost: 0.062,
    fallbackUsed: false,
    createdAt: '2026-07-27T05:10:02Z',
  },
  {
    id: 'ul3',
    workspaceId: 'ws-eng',
    userId: 'u5',
    model: 'gemini',
    tokens: 8000,
    cost: 0.12,
    fallbackUsed: true,
    createdAt: '2026-07-26T18:22:00Z',
  },
]

export const mockDashboardStats: DashboardStats = {
  documentCount: 579,
  activeLlms: 4,
  accuracyPct: 94.2,
  monthlyQueries: 12840,
  budgetLimit: 2450,
  budgetUsed: 1637,
}

export const mockKernelEvents: KernelEvent[] = [
  {
    id: 'k1',
    level: 'info',
    message: 'Router selected Claude for policy interpretation (ws-hr)',
    createdAt: '2026-07-27T05:02:12Z',
  },
  {
    id: 'k2',
    level: 'warn',
    message: 'Gemini latency spike 2.1s — fallback candidate armed',
    createdAt: '2026-07-27T04:55:01Z',
  },
  {
    id: 'k3',
    level: 'error',
    message: 'Perplexity timeout — chain advanced to next model',
    createdAt: '2026-07-26T22:11:44Z',
  },
  {
    id: 'k4',
    level: 'info',
    message: 'Cache hit 0.82 — semantic match on Leave_FAQ',
    createdAt: '2026-07-26T20:03:18Z',
  },
]

export const mockModelHealth: ModelHealth[] = [
  { model: 'gpt', label: 'OpenAI GPT', status: 'operational', latencyMs: 420 },
  { model: 'claude', label: 'Claude', status: 'operational', latencyMs: 510 },
  { model: 'gemini', label: 'Gemini', status: 'degraded', latencyMs: 2100 },
  { model: 'perplexity', label: 'Perplexity', status: 'operational', latencyMs: 680 },
  { model: 'local', label: 'Local (LM Studio)', status: 'operational', latencyMs: 900 },
]

export const defaultFallbackOrder = [
  'gpt',
  'claude',
  'gemini',
  'perplexity',
  'local',
] as const
