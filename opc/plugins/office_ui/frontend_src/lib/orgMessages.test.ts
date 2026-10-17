import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ReactFlowProvider } from '@xyflow/react'
import ts from 'typescript'
import { I18nProvider, type Locale } from '../i18n'
import { OrgCreateModal } from '../org/OrgCreateModal'
import { OrgVersionSwitcher } from '../org/OrgVersionSwitcher'
import { RoleInspector } from '../org/RoleInspector'
import { RoleTable } from '../org/RoleTable'
import { StructureCanvasNode, type StructureCanvasNodeData } from '../org/StructureCanvasNode'
import { DelegationStrategyPanel } from '../org/DelegationStrategyPanel'
import { ConfigImportExportPanel } from '../org/ConfigImportExportPanel'
import type { OrgRole } from '../types/visual'
import { orgMessages, ORG_ZH_MESSAGES } from './orgMessages'

function renderInLocale(element: React.ReactElement, locale: Locale): string {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => locale } })
  try {
    return renderToStaticMarkup(React.createElement(I18nProvider, { children: element }))
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

const role: OrgRole = {
  role_id: 'user-exec-99', name: 'Owner', responsibility: 'Keep this user-authored responsibility.',
  reports_to: 'owner', can_spawn: [], tools: ['file_read'], status: 'active',
  preferred_external_agent: 'codex', runtime_policy: { execution_strategy: 'external' },
  prompt_refs: ['user-authored-prompt'],
}
Object.freeze(role)

const ownedComponents = [
  'TeamView', 'OrgCreateModal', 'OrgVersionSwitcher', 'StructureEditor', 'StructureCanvas',
  'StructureCanvasNode', 'RoleTable', 'RoleInspector', 'DelegationStrategyPanel', 'ConfigImportExportPanel',
]

test('built-in message lookup is stable, preserves unknown data, and interpolates source values', () => {
  const en = orgMessages('en'), zh = orgMessages('zh-CN')
  assert.equal(en, orgMessages('en'))
  assert.equal(zh, orgMessages('zh-CN'))
  assert.notEqual(en, zh)
  assert.equal(zh('New Role'), '新岗位')
  assert.equal(en('{name} (copy)', { name: 'Owner' }), 'Owner (copy)')
  assert.equal(zh('{name} (copy)', { name: 'Owner' }), 'Owner（副本）')
  assert.equal(zh('Unknown server error / custom-data-99'), 'Unknown server error / custom-data-99')
  assert.equal(zh('constructor'), 'constructor')
  assert.equal(en('Delete role "{name}"?', { name: 'User Name' }), 'Delete role "User Name"?')
  assert.equal(zh('Delete role "{name}"?', { name: 'User Name' }), '删除岗位“User Name”？')
  for (const [source, translated] of Object.entries(ORG_ZH_MESSAGES)) {
    assert.equal(en(source), source)
    assert.ok(translated.trim())
    const placeholders = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort()
    assert.deepEqual(placeholders(translated), placeholders(source), source)
  }
})

test('every static message in owned components exists, and translated memo closures depend on msg', () => {
  for (const name of ownedComponents) {
    const file = new URL(`../org/${name}.tsx`, import.meta.url)
    const source = ts.createSourceFile(name, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'msg') {
        const first = node.arguments[0]
        if (first && ts.isStringLiteral(first)) assert.ok(Object.hasOwn(ORG_ZH_MESSAGES, first.text), `${name}: ${first.text}`)
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ['useMemo', 'useCallback'].includes(node.expression.text)) {
        let usesMessage = false
        const body = node.arguments[0]
        const find = (child: ts.Node) => {
          if (ts.isCallExpression(child) && ts.isIdentifier(child.expression) && child.expression.text === 'msg') usesMessage = true
          ts.forEachChild(child, find)
        }
        if (body) find(body)
        if (usesMessage) {
          const deps = node.arguments[1]
          assert.ok(deps && ts.isArrayLiteralExpression(deps) && deps.elements.some(item => ts.isIdentifier(item) && item.text === 'msg'), `${name}: locale-dependent memo missing msg`)
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
})

test('organization creation labels, placeholder and controls switch to Chinese and back', () => {
  const modal = React.createElement(OrgCreateModal, { open: true, onClose: () => undefined, onCreate: () => undefined })
  const zh = renderInLocale(modal, 'zh-CN')
  for (const text of ['新建组织', '创建可保存的组织', '组织名称', '取消', '下一步', '关闭']) assert.ok(zh.includes(text), text)
  assert.ok(zh.includes('示例：研究工作室'))
  const en = renderInLocale(modal, 'en')
  for (const text of ['New organization', 'Create a saved org', 'Organization name', 'Cancel', 'Next', 'HKU Research Lab']) assert.ok(en.includes(text), text)
})

test('table headers and Owner option localize while user names and role IDs stay original', () => {
  const sourceBefore = JSON.stringify(role)
  const table = React.createElement(RoleTable, {
    roles: [role], employees: [], selectedIds: [], onSelectRow: () => undefined,
    onUpdateRole: () => undefined, onDeleteRole: () => undefined,
  })
  const zh = renderInLocale(table, 'zh-CN')
  for (const text of ['名称', '汇报对象', '工具', '执行器', '人员', '全选', '双击编辑', '负责人']) assert.ok(zh.includes(text), text)
  assert.match(zh, /rt-cell-name[^>]*>Owner<\/span>/)
  assert.ok(zh.includes(role.role_id))
  const en = renderInLocale(table, 'en')
  for (const text of ['Name', 'Reports to', 'Tools', 'Agent', 'People', 'Select all']) assert.ok(en.includes(text), text)
  assert.equal(JSON.stringify(role), sourceBefore)
})

test('inspector labels and runtime explanation localize without editing user metadata', () => {
  const props = { role, allRoles: [role], employees: [], onUpdateRole: () => undefined,
    onDeleteRole: () => undefined, onClose: () => undefined }
  const zh = renderInLocale(React.createElement(RoleInspector, props), 'zh-CN')
  for (const text of ['基本信息', '汇报关系', '运行策略', '执行范围', '仅此岗位', '此岗位及其下属岗位', '首选外部执行器']) assert.ok(zh.includes(text), text)
  assert.ok(zh.includes('value="Owner"'))
  assert.ok(zh.includes(role.responsibility))
  assert.ok(zh.includes(role.role_id))
  const en = renderInLocale(React.createElement(RoleInspector, props), 'en')
  assert.ok(en.includes('Identity') && en.includes('This role and descendants'))
})

test('saved organization names stay source values while built-in draft and tooltip localize', () => {
  const props = { savedOrgs: [], activeName: null, isDirty: true,
    onRefresh: () => undefined, onSaveAs: () => undefined, onLoad: () => undefined, onDelete: () => undefined }
  const zh = renderInLocale(React.createElement(OrgVersionSwitcher, props), 'zh-CN')
  assert.ok(zh.includes('草稿') && zh.includes('自打开后已有修改'))
  const saved = renderInLocale(React.createElement(OrgVersionSwitcher, { ...props, activeName: 'draft' }), 'zh-CN')
  assert.match(saved, /sos-pill-name[^>]*>draft<\/span>/)
})

test('graph owner title switches while an ordinary role named Owner stays untouched', () => {
  const data: StructureCanvasNodeData = { roleId: 'owner', name: 'You (Owner)', responsibility: '', icon: null,
    employeeCount: 0, employeeNames: [], isOwner: true, isSelected: false, isDropTarget: false }
  const node = (value: StructureCanvasNodeData) => React.createElement(ReactFlowProvider, null,
    React.createElement(StructureCanvasNode, { data: value }))
  assert.ok(renderInLocale(node(data), 'zh-CN').includes('你（负责人）'))
  assert.ok(renderInLocale(node(data), 'en').includes('You (Owner)'))
  assert.match(renderInLocale(node({ ...data, isOwner: false, name: 'Owner' }), 'zh-CN'), /oc-canvas-node-name[^>]*>Owner<\/span>/)
})

test('runtime counters and statuses localize, preserving run IDs and work-item source names', () => {
  const panel = React.createElement(DelegationStrategyPanel, { roles: [role], runtimeTeams: [], runtimeSeats: [],
    workItems: [{ work_item_id: 'work-custom-01', cell_id: 'cell-custom-01', kind: 'leaf', kanban_column: 'running', role_id: role.role_id, title: 'Original task name', phase: 'running' }],
    frontier: { status: 'running', run_id: 'abcdefghi', running_count: 2, ready_count: 1, blocked_count: 0, waiting_count: 0 },
    companyProfile: 'corporate', topLevelRoleIds: [role.role_id] })
  const zh = renderInLocale(panel, 'zh-CN')
  for (const text of ['协作运行机制', '最终决策岗位', '执行队列', '运行中', '2 项运行中', '企业模式', 'Original task name', 'abcdefgh']) assert.ok(zh.includes(text), text)
  assert.ok(renderInLocale(panel, 'en').includes('2 running, 1 ready, 0 blocked, 0 waiting'))
})

test('configuration upload, preview and validation text localize while YAML errors remain source data', () => {
  const props = { onExport: () => undefined, onImport: () => undefined,
    importPreview: { roles_added: 2, roles_removed: 0, employees_changed: 1 } }
  const zh = renderInLocale(React.createElement(ConfigImportExportPanel, props), 'zh-CN')
  for (const text of ['配置导入与导出', '下载 YAML', '上传配置', '选择文件', '预检查通过', '新增岗位', '变更员工']) assert.ok(zh.includes(text), text)
  const error = renderInLocale(React.createElement(ConfigImportExportPanel, { ...props, importError: 'Custom external validation error' }), 'zh-CN')
  assert.ok(error.includes('校验失败') && error.includes('Custom external validation error'))
  assert.ok(renderInLocale(React.createElement(ConfigImportExportPanel, props), 'en').includes('Config Import / Export'))
})
