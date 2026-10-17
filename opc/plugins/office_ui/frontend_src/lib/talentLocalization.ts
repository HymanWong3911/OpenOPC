import type { Locale } from '../i18n'
import type { TalentTemplate } from '../types/visual'
import translationsA from '../org/locales/talent.zh-a.json'
import translationsB from '../org/locales/talent.zh-b.json'
import translationsC from '../org/locales/talent.zh-c.json'
import tagTranslations from '../org/locales/talent-tags.zh.json'

export interface TalentTranslation {
  name: string
  description: string
  vibe?: string
}

/** Display metadata only. Source templates and hiring identifiers stay untouched. */
export const TALENT_TRANSLATIONS: Readonly<Record<string, TalentTranslation>> = Object.freeze({
  ...translationsA,
  ...translationsB,
  ...translationsC,
})

export const TALENT_CATEGORY_TRANSLATIONS: Readonly<Record<string, string>> = Object.freeze({
  academic: '学术',
  data: '数据',
  design: '设计',
  engineering: '工程开发',
  finance: '财务与金融',
  'game-development': '游戏开发',
  gis: '地理信息',
  healthcare: '医疗健康',
  management: '管理',
  marketing: '市场营销',
  'paid-media': '广告投放',
  product: '产品',
  'project-management': '项目管理',
  research: '研究',
  sales: '销售',
  security: '安全',
  'spatial-computing': '空间计算',
  specialized: '专项职能',
  support: '支持服务',
  testing: '测试',
  writing: '写作',
})

export interface TalentPresentation {
  name: string
  description: string
  vibe: string | undefined
  category: string
}

function findTalentTranslation(templateId: string): TalentTranslation | undefined {
  return Object.hasOwn(TALENT_TRANSLATIONS, templateId) ? TALENT_TRANSLATIONS[templateId] : undefined
}

export function getTalentCategoryLabel(category: string, locale: Locale): string {
  return locale === 'zh-CN' && Object.hasOwn(TALENT_CATEGORY_TRANSLATIONS, category)
    ? TALENT_CATEGORY_TRANSLATIONS[category]
    : category
}

export function getTalentTagLabel(value: string, locale: Locale): string {
  return locale === 'zh-CN' && Object.hasOwn(tagTranslations, value)
    ? (tagTranslations as Record<string, string>)[value] : value
}

export function getTalentPresentation(template: TalentTemplate, locale: Locale): TalentPresentation {
  const original: TalentPresentation = {
    name: template.name,
    description: template.description,
    vibe: template.vibe,
    category: template.category,
  }
  if (locale !== 'zh-CN') return original
  const translation = findTalentTranslation(template.template_id)
  if (!translation) return original
  return {
    name: translation.name,
    description: translation.description,
    vibe: translation.vibe ?? template.vibe,
    category: getTalentCategoryLabel(template.category, locale),
  }
}

/** Search both languages, independently of the selected interface language. */
export function getTalentSearchText(template: TalentTemplate): string {
  const translation = findTalentTranslation(template.template_id)
  return [
    template.template_id,
    template.name,
    template.description,
    template.vibe,
    template.category,
    getTalentCategoryLabel(template.category, 'zh-CN'),
    translation?.name,
    translation?.description,
    translation?.vibe,
    ...template.tags,
    ...template.domains,
    ...template.tags.map(value => getTalentTagLabel(value, 'zh-CN')),
    ...template.domains.map(value => getTalentTagLabel(value, 'zh-CN')),
  ].filter(Boolean).join('\n').normalize('NFKC').toLowerCase()
}

const en = {
  search: 'Search talent templates...',
  all: 'All',
  title: 'Talent Templates',
  templatesCount: (count: number) => `${count} talent template${count === 1 ? '' : 's'}`,
  vacanciesCount: (count: number) => `${count} vacant role${count === 1 ? '' : 's'}`,
  noTemplates: 'No talent templates available.',
  noResults: 'No talent templates match your search.',
  hire: 'Hire →',
  hiring: 'Hiring...',
  domains: 'Domains',
  tags: 'Tags',
  recommendedAgent: 'Recommended Agent',
  agent: 'Agent',
  hireIntoRole: 'Hire into role',
  vacantRoles: 'Vacant roles',
  noVacancies: 'No vacant roles.',
  addRoleFirst: 'Add a role in the Team tab first, then come back to hire.',
  hireToSelectedRole: 'Hire to selected role',
  close: 'Close',
  cancel: 'Cancel',
  hireTitle: (name: string) => `Hire ${name}`,
  pickRole: 'Pick the role to fill with this employee.',
  originalEnglish: 'Original English',
}

const zh: typeof en = {
  search: '搜索中英文角色名称、简介或专业领域…',
  all: '全部',
  title: '角色模板',
  templatesCount: (count: number) => `${count} 个角色模板`,
  vacanciesCount: (count: number) => `${count} 个空缺岗位`,
  noTemplates: '暂无角色模板。',
  noResults: '没有找到匹配的角色模板。',
  hire: '招聘 →',
  hiring: '招聘中…',
  domains: '专业领域',
  tags: '标签',
  recommendedAgent: '推荐执行器',
  agent: '执行器',
  hireIntoRole: '招聘至岗位',
  vacantRoles: '空缺岗位',
  noVacancies: '暂无空缺岗位。',
  addRoleFirst: '先在「团队」页面添加岗位，再返回招聘。',
  hireToSelectedRole: '招聘至选中岗位',
  close: '关闭',
  cancel: '取消',
  hireTitle: (name: string) => `招聘 ${name}`,
  pickRole: '选择该角色要担任的空缺岗位。',
  originalEnglish: '英文原文',
}

export function talentMessages(locale: Locale): typeof en {
  return locale === 'zh-CN' ? zh : en
}
