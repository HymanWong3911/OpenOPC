import assert from 'node:assert/strict'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nProvider, type Locale } from '../i18n'
import { ArchitectureMarketplace } from '../org/ArchitectureMarketplace'
import { PackageCard } from '../org/PackageCard'
import type { ArchitecturePreset, InstalledPackageInfo } from '../types/visual'
import {
  ARCHITECTURE_TRANSLATIONS, architectureMessages, filterArchitecturePresets,
  getArchitectureCategoryLabel, getArchitectureDetailPresentation,
  getArchitectureGateLabel, getArchitecturePatternLabel, getArchitecturePresentation,
  getArchitectureSearchText, getReorgStatusLabel, type ArchitectureDetailPresentation,
} from './architectureLocalization'

// Run with the application JSX configuration:
// TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx --test lib/architectureLocalization.test.ts
const preset: ArchitecturePreset = {
  id: 'startup-studio', name: 'Startup Studio',
  description: 'Lean full-stack startup team. CEO sets strategy, CTO drives tech decisions, engineers and designers build in parallel, QA validates.',
  category: 'startup', tags: ['full-stack', 'agile', 'mvp', 'small-team'], team_size: '3-8',
  emoji: '🚀', color: '#3498db', roles_count: 5, work_item_templates_count: 7, gates_count: 1,
  collaboration_pattern: 'hub_spoke', dag_summary: 'CEO→CTO→[Eng∥Des]→QA→Review→Deploy',
}
const detail: ArchitectureDetailPresentation = {
  id: preset.id, name: preset.name, description: preset.description, category: preset.category,
  tags: [...preset.tags], team_size: preset.team_size, emoji: preset.emoji, color: preset.color,
  collaboration_pattern: preset.collaboration_pattern, dag_summary: preset.dag_summary,
  roles: [
    { id: 'ceo', name: 'CEO', responsibility: 'Product vision, strategy, and final decisions', reports_to: 'owner', can_spawn: ['cto'] },
    { id: 'cto', name: 'CTO', responsibility: 'Technical architecture and engineering leadership', reports_to: 'ceo', can_spawn: ['engineer', 'designer'] },
    { id: 'engineer', name: 'Engineer', responsibility: 'Full-stack development and implementation', reports_to: 'cto', can_spawn: [] },
    { id: 'designer', name: 'Designer', responsibility: 'UI/UX design, prototyping, and user research', reports_to: 'cto', can_spawn: [] },
    { id: 'qa', name: 'QA Engineer', responsibility: 'Testing, quality assurance, and bug tracking', reports_to: 'cto', can_spawn: [] },
  ],
  work_item_templates: [
    { id: 'planning', title: 'Planning', role_id: 'ceo', dependencies: [], parallel_group: null, gate: null },
    { id: 'architecture', title: 'Architecture', role_id: 'cto', dependencies: ['planning'], parallel_group: null, gate: null },
    { id: 'design', title: 'Design', role_id: 'designer', dependencies: ['architecture'], parallel_group: 'build', gate: null },
    { id: 'development', title: 'Development', role_id: 'engineer', dependencies: ['architecture'], parallel_group: 'build', gate: null },
    { id: 'testing', title: 'Testing', role_id: 'qa', dependencies: ['design', 'development'], parallel_group: null, gate: null },
    { id: 'review', title: 'Review', role_id: 'cto', dependencies: ['testing'], parallel_group: null, gate: { type: 'review', reviewer_role: 'ceo' } },
    { id: 'deploy', title: 'Deploy', role_id: 'engineer', dependencies: ['review'], parallel_group: null, gate: null },
  ],
}

function freezeTree(value: unknown): void {
  if (!value || typeof value !== 'object') return
  Object.values(value).forEach(freezeTree)
  Object.freeze(value)
}
freezeTree(preset)
freezeTree(detail)

/** Exercise the real locale provider without changing a browser preference. */
function renderInLocale(element: React.ReactElement, locale: Locale): string {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => locale, setItem: () => undefined },
  })
  try {
    return renderToStaticMarkup(React.createElement(I18nProvider, { children: element }))
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

const noop = () => undefined
const marketProps: React.ComponentProps<typeof ArchitectureMarketplace> = {
  presets: [preset], previewData: detail, installedIds: new Set(), applyingPresetId: null,
  readOnly: false, onPreview: noop, onApplyPreset: noop, onClearPreview: noop,
  installedPackages: [], channels: [], reorgProposals: [], isCustomMode: true,
  onReorgDecide: async () => ({
    ok: true, accepted: true, checkpoint_id: 'fixture-checkpoint',
    checkpoint_type: 'reorg_review', client_request_id: 'fixture-request',
  }), onMarketInstall: noop, onMarketUninstall: noop,
}

test('display projections preserve frozen source payloads and restore exact English', () => {
  const original = JSON.stringify({ preset, detail })
  const zh = getArchitecturePresentation(preset, 'zh-CN')
  assert.equal(zh.name, '创业工作室')
  assert.equal(zh.category, '创业')
  assert.deepEqual(zh.tags, ['全栈', '敏捷', '最小可行产品', '小型团队'])
  assert.notEqual(zh.dag_summary, preset.dag_summary)
  const zhDetail = getArchitectureDetailPresentation(detail, 'zh-CN')
  assert.equal(zhDetail.roles[0].name, 'CEO 首席执行官')
  assert.equal(zhDetail.roles[0].responsibility, '负责产品愿景、战略和最终决策。')
  assert.equal(zhDetail.work_item_templates[0].title, '规划')
  assert.equal(zhDetail.dag_summary, zh.dag_summary)
  assert.deepEqual(zhDetail.roles.map(({ name, responsibility, ...data }) => data), detail.roles.map(({ name, responsibility, ...data }) => data))
  assert.deepEqual(zhDetail.work_item_templates.map(({ title, ...data }) => data), detail.work_item_templates.map(({ title, ...data }) => data))
  assert.equal(zh.id, preset.id)
  assert.equal(zh.color, preset.color)
  assert.equal(zh.collaboration_pattern, preset.collaboration_pattern)
  assert.strictEqual(getArchitecturePresentation(preset, 'en'), preset)
  assert.strictEqual(getArchitectureDetailPresentation(detail, 'en'), detail)
  assert.equal(JSON.stringify({ preset, detail }), original)
})

test('unknown architectures, nested items and prototype names retain their original content', () => {
  for (const id of ['custom-enterprise', 'constructor', '__proto__']) {
    const custom = { ...preset, id, name: 'Client team — 张先生', category: 'customer-defined' }
    const customDetail = { ...detail, id }
    assert.strictEqual(getArchitecturePresentation(custom, 'zh-CN'), custom)
    assert.strictEqual(getArchitectureDetailPresentation(customDetail, 'zh-CN'), customDetail)
    assert.equal(getArchitectureCategoryLabel(custom.category, 'zh-CN', [custom]), custom.category)
  }
  const customRole = { ...detail.roles[0], id: 'constructor', name: 'Customer coordinator' }
  const customWorkItem = { ...detail.work_item_templates[0], id: '__proto__', title: 'Customer deliverable' }
  const mixed = { ...detail, tags: ['constructor'], roles: [customRole], work_item_templates: [customWorkItem] }
  const projected = getArchitectureDetailPresentation(mixed, 'zh-CN')
  assert.strictEqual(projected.roles[0], customRole)
  assert.strictEqual(projected.work_item_templates[0], customWorkItem)
  assert.deepEqual(projected.tags, ['constructor'])
  assert.equal(getArchitecturePatternLabel('constructor', 'zh-CN'), 'constructor')
  assert.equal(getArchitectureGateLabel('__proto__', 'zh-CN'), '__proto__')
  assert.equal(getReorgStatusLabel('customer-status', 'zh-CN'), 'customer-status')
})

test('bilingual search and raw category/pattern filters return the original source objects', () => {
  const indexed = getArchitectureSearchText(preset)
  for (const query of ['创业工作室', 'Startup Studio', '精简', 'Lean full-stack', '创业', 'startup',
    '全栈', 'full-stack', '中心辐射', 'Hub & Spoke', 'hub_spoke', preset.id]) {
    assert.ok(indexed.includes(query.normalize('NFKC').toLowerCase()), `Missing ${query}`)
    const matches = filterArchitecturePresets([preset], { query, category: 'startup', pattern: 'hub_spoke' })
    assert.equal(matches.length, 1)
    assert.strictEqual(matches[0], preset)
  }
  assert.deepEqual(filterArchitecturePresets([preset], { category: '创业' }), [])
  assert.deepEqual(filterArchitecturePresets([preset], { query: 'no-match' }), [])
  const custom = { ...preset, id: 'custom', name: 'ＦＭＯＤ team' }
  assert.strictEqual(filterArchitecturePresets([custom], { query: ' fmod ' })[0], custom)
  assert.equal(getArchitectureCategoryLabel('startup', 'zh-CN', [preset]), '创业')
  assert.equal(getArchitectureCategoryLabel('startup', 'en', [preset]), 'startup')
})

test('real provider renders Chinese card and detail text and restores English metadata and aria labels', () => {
  const element = React.createElement(ArchitectureMarketplace, marketProps)
  const original = JSON.stringify({ preset, detail })
  const zh = renderInLocale(element, 'zh-CN')
  for (const value of ['创业工作室', '架构蓝图', '1 个架构', '全部协作模式', '中心辐射', '全栈',
    'CEO 首席执行官', '负责产品愿景、战略和最终决策。', '工作项模板（7 个模板）',
    '汇报给：', '可派生：', '并行', '审核人：', '使用此架构', '已安装的包', '渠道与连接器']) {
    assert.ok(zh.includes(value), `Missing Chinese render: ${value}`)
  }
  assert.match(zh, /aria-label="关闭"/)
  assert.match(zh, /role="dialog" aria-modal="true" aria-label="创业工作室"/)
  assert.match(zh, /aria-label="预览创业工作室"/)
  assert.match(zh, /<code>owner<\/code>/)
  assert.match(zh, /<code>ceo<\/code>/)
  assert.match(zh, /org-dag-node-id">planning</)
  assert.doesNotMatch(zh, /🚀|Lean full-stack startup team/)
  const en = renderInLocale(element, 'en')
  assert.ok(en.includes(preset.description))
  assert.ok(en.includes(preset.dag_summary))
  assert.ok(en.includes(detail.roles[0].responsibility))
  for (const value of ['Startup Studio', 'Architecture Blueprints', 'Search architectures...',
    'Hub &amp; Spoke', 'reports to:', 'spawns:', 'Work item templates (7 templates)', 'parallel']) {
    assert.ok(en.includes(value), `Missing English render: ${value}`)
  }
  assert.match(en, /aria-label="Close"/)
  assert.doesNotMatch(en, /创业工作室|全部协作模式/)
  assert.equal(JSON.stringify({ preset, detail }), original)
  const empty = renderInLocale(React.createElement(ArchitectureMarketplace, { ...marketProps, presets: [], previewData: null }), 'zh-CN')
  assert.match(empty, /没有找到匹配的架构。/)
})

test('custom architecture text and package names survive localized controls', () => {
  const custom = { ...preset, id: 'client-organization', name: 'Acme — 张先生', description: 'Customer content', category: 'customer-category' }
  const markup = renderInLocale(React.createElement(ArchitectureMarketplace, { ...marketProps, presets: [custom], previewData: null }), 'zh-CN')
  for (const text of [custom.name, custom.description, custom.category]) assert.ok(markup.includes(text))
  const pkg: InstalledPackageInfo = {
    package_id: 'client-package', name: 'Client package — 李小姐', version: '1.2.3',
    installed_at: '2026-10-14T10:00:00Z', source_path: '/client/package.opcpkg',
    role_ids: ['custom-role'], template_ids: ['custom-template'], work_item_template_ids: ['custom-template'],
  }
  freezeTree(pkg)
  const packageElement = React.createElement(PackageCard, { pkg, onUninstall: noop })
  const zh = renderInLocale(packageElement, 'zh-CN')
  for (const text of [pkg.name, '1 个角色', '1 个模板', '安装于', '卸载']) assert.ok(zh.includes(text))
  assert.match(zh, /alt="安装包"/)
  const en = renderInLocale(packageElement, 'en')
  for (const text of [pkg.name, '1 roles', '1 templates', 'Installed', 'Uninstall']) assert.ok(en.includes(text))
  assert.match(en, /alt="package"/)
  assert.equal(pkg.package_id, 'client-package')
})

test('built-in channel, reorg, confirmation and gate labels follow the locale', () => {
  assert.equal(getArchitectureGateLabel('review', 'zh-CN'), '评审')
  assert.equal(getArchitectureGateLabel('approval', 'en'), 'approval')
  assert.equal(getReorgStatusLabel('execution_unknown', 'zh-CN'), '执行结果未知')
  assert.equal(getReorgStatusLabel('proposed', 'en'), 'proposed')
  const zh = architectureMessages('zh-CN')
  assert.equal(zh.enabled, '已启用')
  assert.equal(zh.decisionNotAccepted, '决策未被接受。')
  assert.equal(zh.decisionFailed, '决策提交失败。')
  assert.equal(zh.uninstallConfirm, '卸载此包？该包提供的角色和工作项模板将被移除。')
  assert.equal(architectureMessages('en').decisionNotAccepted, 'Decision was not accepted.')
  assert.equal(Object.keys(ARCHITECTURE_TRANSLATIONS).length, 7)
})
