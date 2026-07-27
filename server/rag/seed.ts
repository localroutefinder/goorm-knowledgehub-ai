import '../loadEnv.js'
import { ensureSchema } from '../db.js'
import { indexDocument } from './indexDocument.js'

const samples = [
  {
    id: 'doc-hr-policy',
    workspaceId: 'ws-hr',
    filename: 'HR_Policy_Manual.md',
    type: 'md' as const,
    content: `# 인사 규정 매뉴얼

## 1. 입사 후 제출 서류
신입사원은 입사일로부터 7일 이내에 아래 서류를 인사팀에 제출해야 한다.

1. 주민등록등본 1부
2. 졸업증명서 및 성적증명서 각 1부
3. 경력증명서 (해당 시)
4. 건강보험 자격득실 확인서
5. 통장 사본 (급여 이체용)
6. 사진 파일 (반명함판, JPG)

제출 방법은 사내 포털 > HR 문서함 업로드 또는 인사팀 메일(hr@example.com)이다.

## 2. 수습 및 연차
- 수습 기간은 통상 3개월이다.
- 수습 기간 중에도 월할 연차가 발생한다.
- 입사일 기준 1개월 개근 시 1일의 연차가 부여된다.
- 수습 종료 후 잔여 연차는 정규직 연차 규정으로 전환된다.

## 3. 연차 사용
- 연차 사용은 최소 1일 전까지 팀장 승인을 받는다.
- 반차는 오전/오후 단위로 신청 가능하다.
`,
  },
  {
    id: 'doc-leave-faq',
    workspaceId: 'ws-hr',
    filename: 'Leave_FAQ.txt',
    type: 'txt' as const,
    content: `연차 FAQ

Q. 신입사원도 연차를 바로 쓸 수 있나요?
A. 네. 1개월 개근 후 발생한 1일부터 사용할 수 있습니다.

Q. 입사 서류는 언제까지 내야 하나요?
A. 입사 후 7일 이내입니다. 미제출 시 급여 이체 및 4대보험 신고가 지연될 수 있습니다.

Q. 연차 대신 대체휴무를 쓸 수 있나요?
A. 주말/공휴일 근무에 대한 대체휴무는 별도 규정으로 운영되며, 연차와 중복 적용되지 않습니다.
`,
  },
  {
    id: 'doc-payroll',
    workspaceId: 'ws-hr',
    filename: 'Payroll_Logic_v4.pdf',
    type: 'pdf' as const,
    content: `# 급여/오버타임 산정 로직 v4

## 변경 요약 (6월 → 7월)
1. Tier 2 오버타임 임계값: 주 45시간 → 주 42.5시간
2. 주말 배수 상한: 2.5x → 2.2x (비필수 인력)
3. 야간수당(22:00~06:00)은 기존과 동일하게 1.5x 유지

## 적용 시점
- 2026년 7월 급여분부터 적용
- 예외: 교대근무 필수 인력은 기존 배수 유지 (별도 부서 고지)
`,
  },
]

async function main() {
  console.log('[seed] ensuring schema...')
  await ensureSchema()

  for (const sample of samples) {
    console.log(`[seed] indexing ${sample.filename}...`)
    const result = await indexDocument({
      id: sample.id,
      workspaceId: sample.workspaceId,
      filename: sample.filename,
      type: sample.type,
      content: sample.content,
      accessLevel: 'workspace',
      uploadedBy: 'seed',
    })
    console.log(`[seed] ok chunks=${result.chunkCount}`)
  }

  console.log('[seed] done')
  process.exit(0)
}

main().catch((err) => {
  console.error('[seed] failed', err)
  process.exit(1)
})
