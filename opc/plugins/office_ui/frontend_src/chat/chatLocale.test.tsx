import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nProvider, type Locale } from '../i18n'
import { useChatText } from '../lib/chatMessages'
import { MessageComposer } from './MessageComposer'
import { MessageList } from './MessageList'
import { AgentProgressBlock } from './AgentProgressBlock'
import { AgentWorkPanel } from './AgentWorkPanel'
import { TaskHeaderBar } from './TaskHeaderBar'
import { TaskUserInputPanel } from './TaskUserInputPanel'
import { EscalationPanel } from './EscalationPanel'
import { RecruitmentPanel } from './RecruitmentPanel'
import { StaffingSelectionPanel } from './StaffingSelectionPanel'
import { ReorgPanel } from './ReorgPanel'
import { DeliveryFeedbackPanel } from './DeliveryFeedbackPanel'
import { WorkItemProgressCard } from './WorkItemProgressCard'
import { MarkdownBody } from './MarkdownBody'
import { ExternalTeamSummaryCard } from './ExternalTeamSummaryCard'
import type { Session } from '../types/kanban'
import type { ChatMessageMeta } from '../types/chat'

function renderLocale(node: React.ReactNode, locale: Locale): string {
  const prior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => locale } })
  try {
    return renderToStaticMarkup(<I18nProvider>{node}</I18nProvider>)
  } finally {
    if (prior) Object.defineProperty(globalThis, 'localStorage', prior)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

const now = Date.now()
const session: Session = {
  projectId: 'project-raw', taskId: 'task-raw', channelId: 'session:task-raw', title: 'Review customer data',
  status: 'pending', columnId: 'todo', assigneeIds: [], priority: null, tags: [], progressLog: [],
  createdAt: now - 120_000, updatedAt: now, messageCount: 0,
}
const staffingMeta: ChatMessageMeta = {
  checkpoint_type: 'company_staffing_selection', checkpoint_id: 'cp-staffing', company_profile: 'corporate',
  staffing_roles: [{ role_id: 'role-raw', role_label: 'Personal Role Name', default_selection: { kind: 'employee', id: 'employee-raw' } }],
  staffing_pool: { employees: [{ employee_id: 'employee-raw', employee_name: 'Review', role_id: 'role-raw', category: 'engineering' }], templates: [] },
}
const cases: Array<[React.ReactNode, string, string]> = [
  [<MessageComposer execMode="task" taskPreferredAgent="native" nativeApprovalLevel="read-only" onSend={() => undefined} onModeChange={() => undefined} onTaskAgentChange={() => undefined} />, 'Read-only', '只读'],
  [<MessageList messages={[]} channelName="" />, 'New Conversation', '新对话'],
  [<AgentProgressBlock entries={[{ type: 'thinking', summary: 'User-authored summary', timestamp: now }]} agentStatus="reflecting" />, 'Thinking', '思考中'],
  [<AgentWorkPanel sessions={[session]} agents={[]} />, 'Search agents', '搜索智能体'],
  [<TaskHeaderBar session={session} agents={[]} onTitleChange={() => undefined} />, 'Pending', '待处理'],
  [<TaskUserInputPanel meta={{ checkpoint_type: 'task_user_input', input_questions: [{ id: 'question-raw', question: 'User question remains English', options: [{ id: 'a', label: 'Customer choice' }], allow_freeform: true }] }} responded={false} onReply={() => undefined} />, 'Enter a custom answer', '输入自定义回答'],
  [<EscalationPanel meta={{ checkpoint_type: 'tool_permission', prompt: 'Do not translate tool arguments', options: [{ id: 'approve_once', label: 'Approve once' }], default_action: 'deny' }} responded={false} onReply={() => undefined} />, 'Tool Authorization', '工具授权'],
  [<RecruitmentPanel meta={{ ...staffingMeta, checkpoint_type: 'company_recruitment_confirmation' }} responded={false} onReply={async () => true} />, 'Recruitment Review', '招聘评审'],
  [<StaffingSelectionPanel meta={staffingMeta} responded={false} onReply={() => undefined} />, 'Approve Selections', '批准所选配置'],
  [<ReorgPanel meta={{ risk_level: 'medium', role_changes: [{ action: 'add', role_id: 'role-raw', reason: '' }] }} responded={false} onReply={() => undefined} />, 'Approve Reorg', '批准重组'],
  [<DeliveryFeedbackPanel meta={{ prompt: 'Customer delivery content stays English' }} responded={false} onReply={async () => true} />, 'Fully Agree', '完全同意'],
  [<WorkItemProgressCard workItemLog={[]} isCompanyRuntime />, 'Preparing company roles', '正在准备公司岗位'],
  [<MarkdownBody content={'```ts\nconst originalName = "Review"\n```'} />, 'Copy', '复制'],
  [<ExternalTeamSummaryCard session={{ ...session, selectedExecutionAgent: 'jiuwenswarm', executionUnitKind: 'opaque_external_team' }} />, 'Team starting', '团队正在启动'],
]
for (const [node, english, chinese] of cases) {
  assert.ok(renderLocale(node, 'en').includes(english), `English copy missing: ${english}`)
  assert.ok(renderLocale(node, 'zh-CN').includes(chinese), `Chinese copy missing: ${chinese}`)
}

const composerEnglish = renderLocale(cases[0][0], 'en')
const composerChinese = renderLocale(cases[0][0], 'zh-CN')
assert.ok(composerEnglish.includes('writes, network, and side effects ask first.'))
assert.ok(composerChinese.includes('写入、联网和其他有副作用的操作需先请求批准。'))
for (const value of ['read-only', 'auto', 'full-access', 'task', 'company', 'native']) {
  assert.ok(composerEnglish.includes(`value="${value}"`), `Missing original protocol value ${value}`)
  assert.ok(composerChinese.includes(`value="${value}"`), `Translated protocol value ${value}`)
}
const staffingChinese = renderLocale(cases[8][0], 'zh-CN')
assert.ok(staffingChinese.includes('Personal Role Name'))
assert.ok(staffingChinese.includes('>Review</'))
assert.ok(staffingChinese.includes('ckpt-staffing-option active'), 'Locale must not alter selectionKey matching')
const reorgChinese = renderLocale(cases[9][0], 'zh-CN')
assert.ok(reorgChinese.includes('ckpt-action-add'), 'Locale must not alter action CSS class')
assert.ok(reorgChinese.includes('role-raw'))
const questionChinese = renderLocale(cases[5][0], 'zh-CN')
assert.ok(questionChinese.includes('User question remains English'))
assert.ok(questionChinese.includes('Customer choice'))
assert.ok(renderLocale(cases[6][0], 'zh-CN').includes('Do not translate tool arguments'))
assert.ok(renderLocale(cases[12][0], 'zh-CN').includes('originalName'))

function Counts() {
  const tr = useChatText()
  return <span>{tr('{count}m ago', { count: 2 })} | {tr('Show more ({count} earlier steps)', { count: 6 })}</span>
}
assert.ok(renderLocale(<Counts />, 'en').includes('2m ago | Show more (6 earlier steps)'))
assert.ok(renderLocale(<Counts />, 'zh-CN').includes('2 分钟前 | 展开更多（此前 6 个步骤）'))
console.log('chatLocale.test.tsx: OK (14 components, locale copy, permission semantics, protocol values, personal content, CSS and selected option boundaries)')
