import type { Locale } from '../i18n'
import type { ArchitecturePreset, ArchitecturePresetDetail } from '../types/visual'
import architectureZh from '../org/locales/architecture.zh.json'

interface ArchitectureTranslation {
  name: string
  description: string
  category: string
  dag_summary: string
  tags: Record<string, string>
  roles: Record<string, { name: string; responsibility: string }>
  workItems: Record<string, { title: string }>
}

/** Display metadata never changes architecture identifiers or source payloads. */
export const ARCHITECTURE_TRANSLATIONS: Readonly<Record<string, ArchitectureTranslation>> = Object.freeze(architectureZh)

function ownValue<T>(values: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(values, key) ? values[key] : undefined
}

function translationFor(id: string): ArchitectureTranslation | undefined {
  return ownValue(ARCHITECTURE_TRANSLATIONS, id)
}

function translatedFields(
  source: Pick<ArchitecturePreset, 'name' | 'description' | 'category' | 'tags'>,
  translation: ArchitectureTranslation,
) {
  return {
    name: translation.name || source.name,
    description: translation.description || source.description,
    category: translation.category || source.category,
    tags: source.tags.map(tag => ownValue(translation.tags, tag) || tag),
  }
}

export function getArchitecturePresentation(source: ArchitecturePreset, locale: Locale): ArchitecturePreset {
  const translation = locale === 'zh-CN' ? translationFor(source.id) : undefined
  if (!translation) return source
  return {
    ...source,
    ...translatedFields(source, translation),
    dag_summary: translation.dag_summary || source.dag_summary,
  }
}

export type ArchitectureDetailPresentation = ArchitecturePresetDetail & {
  collaboration_pattern?: string
  dag_summary?: string
}

export function getArchitectureDetailPresentation(source: ArchitectureDetailPresentation, locale: Locale): ArchitectureDetailPresentation {
  const translation = locale === 'zh-CN' ? translationFor(source.id) : undefined
  if (!translation) return source
  return {
    ...source,
    ...translatedFields(source, translation),
    dag_summary: translation.dag_summary || source.dag_summary,
    roles: source.roles.map(role => {
      const text = ownValue(translation.roles, role.id)
      return text ? { ...role, name: text.name || role.name, responsibility: text.responsibility || role.responsibility } : role
    }),
    work_item_templates: source.work_item_templates.map(template => {
      const text = ownValue(translation.workItems, template.id)
      return text ? { ...template, title: text.title || template.title } : template
    }),
  }
}

export function getArchitectureCategoryLabel(category: string, locale: Locale, presets: readonly ArchitecturePreset[]): string {
  if (locale !== 'zh-CN') return category
  const preset = presets.find(item => item.category === category && translationFor(item.id))
  return preset ? getArchitecturePresentation(preset, locale).category : category
}

const patterns = {
  pipeline: ['Pipeline', '顺序流程'],
  hub_spoke: ['Hub & Spoke', '中心辐射'],
  review_loop: ['Review Loop', '评审循环'],
  hierarchical: ['Hierarchical', '层级协作'],
  flat: ['Flat Team', '扁平团队'],
} satisfies Record<string, [string, string]>

export function getArchitecturePatternLabel(pattern: string, locale: Locale): string {
  const values = ownValue(patterns, pattern)
  return values ? values[locale === 'zh-CN' ? 1 : 0] : pattern
}

const gateTypes: Record<string, string> = { review: '评审', approval: '批准', hold: '暂停' }
const reorgStatuses: Record<string, string> = {
  proposed: '待审议', approved: '已批准', applying: '应用中', denied: '已否决',
  applied: '已应用', failed: '失败', execution_unknown: '执行结果未知', cancelled: '已取消',
}

export function getArchitectureGateLabel(type: string, locale: Locale): string {
  return locale === 'zh-CN' ? ownValue(gateTypes, type) ?? type : type
}

export function getReorgStatusLabel(status: string, locale: Locale): string {
  return locale === 'zh-CN' ? ownValue(reorgStatuses, status) ?? status : status
}

/** Both languages remain searchable after changing the interface language. */
export function getArchitectureSearchText(source: ArchitecturePreset): string {
  const translated = getArchitecturePresentation(source, 'zh-CN')
  return [
    source.id, source.name, source.description, source.category, ...source.tags,
    translated.name, translated.description, translated.category, ...translated.tags,
    source.collaboration_pattern,
    getArchitecturePatternLabel(source.collaboration_pattern, 'en'),
    getArchitecturePatternLabel(source.collaboration_pattern, 'zh-CN'),
  ].join('\n').normalize('NFKC').toLowerCase()
}

export function filterArchitecturePresets(
  sources: readonly ArchitecturePreset[],
  { category, pattern, query = '' }: { category?: string | null; pattern?: string | null; query?: string },
): ArchitecturePreset[] {
  const normalized = query.trim().normalize('NFKC').toLowerCase()
  return sources.filter(source => (
    (!category || source.category === category)
    && (!pattern || source.collaboration_pattern === pattern)
    && (!normalized || getArchitectureSearchText(source).includes(normalized))
  ))
}

const en = {
  search: 'Search architectures...',
  all: 'All',
  allPatterns: 'All Patterns',
  architecturesCount: (count: number) => `${count} architectures`,
  blueprints: 'Architecture Blueprints',
  noResults: 'No architectures match your search.',
  installedPackages: 'Installed Packages',
  import: 'Import',
  path: 'Path',
  install: 'Install',
  cancel: 'Cancel',
  noPackages: 'No packages installed.',
  channels: 'Channels & Connectors',
  enabled: 'enabled',
  running: 'running',
  disabled: 'disabled',
  noChannels: 'No channels configured.',
  reorgProposals: 'Reorg Proposals',
  untitled: 'Untitled',
  submitting: 'Submitting…',
  approve: 'Approve',
  deny: 'Deny',
  decisionSubmitted: 'Decision submitted',
  approvalUnavailable: 'Approval is unavailable until its review checkpoint is restored.',
  decisionNotAccepted: 'Decision was not accepted.',
  decisionFailed: 'Decision failed.',
  uninstallConfirm: 'Uninstall this package? Roles and work-item templates from this package will be removed.',
  rolesCount: (count: number) => `${count} roles`,
  templatesCount: (count: number) => `${count} templates`,
  checkpointsCount: (count: number) => `${count} checkpoints`,
  peopleCount: (count: string) => `${count} people`,
  installed: 'Installed',
  applying: 'Applying...',
  useThis: 'Use This',
  preview: 'Preview',
  previewTitle: (name: string) => `Preview ${name}`,
  close: 'Close',
  tags: 'Tags',
  rolesTitle: (count: number) => `Roles (${count})`,
  reportsTo: 'reports to:',
  spawns: 'spawns:',
  workItemsTitle: (count: number) => `Work item templates (${count} templates)`,
  alreadyInstalled: 'Already Installed',
  useArchitecture: 'Use This Architecture',
  parallel: 'parallel',
  reviewedBy: 'by',
  package: 'package',
  roles: 'roles',
  templates: 'templates',
  installedDate: (date: string) => `Installed ${date}`,
  removing: 'Removing...',
  uninstall: 'Uninstall',
}

const zh: typeof en = {
  search: '搜索中英文架构名称、简介、分类或标签…',
  all: '全部',
  allPatterns: '全部协作模式',
  architecturesCount: (count: number) => `${count} 个架构`,
  blueprints: '架构蓝图',
  noResults: '没有找到匹配的架构。',
  installedPackages: '已安装的包',
  import: '导入',
  path: '路径',
  install: '安装',
  cancel: '取消',
  noPackages: '尚未安装任何包。',
  channels: '渠道与连接器',
  enabled: '已启用',
  running: '运行中',
  disabled: '已停用',
  noChannels: '尚未配置渠道。',
  reorgProposals: '重组提案',
  untitled: '未命名',
  submitting: '提交中…',
  approve: '批准',
  deny: '否决',
  decisionSubmitted: '决策已提交',
  approvalUnavailable: '恢复评审检查点后才能批准。',
  decisionNotAccepted: '决策未被接受。',
  decisionFailed: '决策提交失败。',
  uninstallConfirm: '卸载此包？该包提供的角色和工作项模板将被移除。',
  rolesCount: (count: number) => `${count} 个角色`,
  templatesCount: (count: number) => `${count} 个模板`,
  checkpointsCount: (count: number) => `${count} 个检查点`,
  peopleCount: (count: string) => `${count} 人`,
  installed: '已安装',
  applying: '应用中…',
  useThis: '使用此架构',
  preview: '预览',
  previewTitle: (name: string) => `预览${name}`,
  close: '关闭',
  tags: '标签',
  rolesTitle: (count: number) => `角色（${count}）`,
  reportsTo: '汇报给：',
  spawns: '可派生：',
  workItemsTitle: (count: number) => `工作项模板（${count} 个模板）`,
  alreadyInstalled: '已安装',
  useArchitecture: '使用此架构',
  parallel: '并行',
  reviewedBy: '审核人：',
  package: '安装包',
  roles: '角色',
  templates: '模板',
  installedDate: (date: string) => `安装于 ${date}`,
  removing: '移除中…',
  uninstall: '卸载',
}

export function architectureMessages(locale: Locale): typeof en {
  return locale === 'zh-CN' ? zh : en
}
