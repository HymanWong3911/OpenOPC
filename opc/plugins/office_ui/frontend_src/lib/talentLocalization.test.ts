import assert from 'node:assert/strict'
import { test } from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nProvider, type Locale } from '../i18n'
import { TalentCard } from '../org/TalentCard'
import { TalentDetailModal } from '../org/TalentDetailModal'
import { EmployeesMarketplace } from '../org/EmployeesMarketplace'
import { HireToRoleModal } from '../org/HireToRoleModal'
import type { OrgRole, TalentTemplate } from '../types/visual'
import translationsA from '../org/locales/talent.zh-a.json'
import translationsB from '../org/locales/talent.zh-b.json'
import translationsC from '../org/locales/talent.zh-c.json'
import {
  getTalentCategoryLabel, getTalentPresentation, getTalentSearchText,
  TALENT_CATEGORY_TRANSLATIONS, TALENT_TRANSLATIONS, talentMessages,
} from './talentLocalization'

const template: TalentTemplate = {
  template_id: 'agency-finance-investment-researcher',
  name: 'Investment Researcher',
  description: 'Expert investment researcher specializing in market research, due diligence, portfolio analysis, and asset valuation. Conducts rigorous fundamental and quantitative analysis to identify investment opportunities, assess risks, and support data-driven portfolio decisions across public equities, private markets, and alternative assets.',
  category: 'finance', tags: ['equities', 'valuation'], domains: ['due diligence'],
  preferred_external_agent: 'codex', source_repo: 'agency-agents', vibe: '',
}
Object.freeze(template.tags)
Object.freeze(template.domains)
Object.freeze(template)
const vacancy: OrgRole = {
  role_id: 'portfolio-reviewer', name: 'Portfolio Reviewer — 陈先生',
  responsibility: 'Review a proposed portfolio.', status: 'vacant',
  reports_to: 'ceo', can_spawn: [], tools: [],
}

/** Exercise the real provider without changing a browser session. */
function renderInLocale(element: React.ReactElement, locale: Locale): string {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true, value: { getItem: () => locale, setItem: () => undefined },
  })
  try {
    return renderToStaticMarkup(React.createElement(I18nProvider, { children: element }))
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

test('all 300 entries are unique and have Chinese names and descriptions', () => {
  const entries = [translationsA, translationsB, translationsC]
  const ids = entries.flatMap(part => Object.keys(part))
  assert.deepEqual(entries.map(part => Object.keys(part).length), [100, 100, 100])
  assert.equal(ids.length, 300)
  assert.equal(new Set(ids).size, 300)
  assert.equal(Object.keys(TALENT_TRANSLATIONS).length, 300)
  for (const id of ids) {
    assert.match(TALENT_TRANSLATIONS[id].name, /[\u4e00-\u9fff]/, id)
    assert.match(TALENT_TRANSLATIONS[id].description, /[\u4e00-\u9fff]/, id)
    assert.ok(TALENT_TRANSLATIONS[id].name.trim() && TALENT_TRANSLATIONS[id].description.trim())
  }
  assert.deepEqual(Object.keys(TALENT_CATEGORY_TRANSLATIONS).sort(), [
    'academic', 'data', 'design', 'engineering', 'finance', 'game-development',
    'gis', 'healthcare', 'management', 'marketing', 'paid-media', 'product',
    'project-management', 'research', 'sales', 'security', 'spatial-computing',
    'specialized', 'support', 'testing', 'writing',
  ])
})

test('Chinese display switches back to exact English without changing the template', () => {
  const before = JSON.stringify(template)
  const zh = getTalentPresentation(template, 'zh-CN')
  assert.equal(zh.name, '投资研究员')
  assert.equal(zh.description, TALENT_TRANSLATIONS[template.template_id].description)
  assert.equal(zh.category, '财务与金融')
  assert.deepEqual(getTalentPresentation(template, 'en'), {
    name: template.name, description: template.description,
    vibe: template.vibe, category: template.category,
  })
  assert.equal(JSON.stringify(template), before)
  assert.equal(template.template_id, 'agency-finance-investment-researcher')
  assert.equal(template.preferred_external_agent, 'codex')
})

test('unknown IDs and categories retain original text, including object prototype names', () => {
  for (const templateId of ['custom-talent', 'constructor', '__proto__']) {
    const unknown = { ...template, template_id: templateId, vibe: 'Original voice' }
    assert.deepEqual(getTalentPresentation(unknown, 'zh-CN'), {
      name: unknown.name, description: unknown.description,
      vibe: unknown.vibe, category: unknown.category,
    })
  }
  assert.equal(getTalentCategoryLabel('custom-category', 'zh-CN'), 'custom-category')
  assert.equal(getTalentCategoryLabel('constructor', 'zh-CN'), 'constructor')
  assert.equal(getTalentCategoryLabel('project-management', 'en'), 'project-management')
  assert.equal(getTalentCategoryLabel('project-management', 'zh-CN'), '项目管理')
  assert.equal(getTalentPresentation({ ...template, vibe: undefined }, 'en').vibe, undefined)
})

test('search includes both languages, original tags, domains, categories and ID', () => {
  const text = getTalentSearchText(template)
  for (const query of ['投资研究员', '基本面', '财务与金融', 'Investment Researcher',
    'fundamental and quantitative analysis', 'finance', 'equities', 'due diligence', template.template_id]) {
    assert.ok(text.includes(query.normalize('NFKC').toLowerCase()), `Missing: ${query}`)
  }
  assert.ok(getTalentSearchText({ ...template, template_id: 'custom', name: 'ＦＭＯＤ specialist' }).includes('fmod'))
})

test('cards show secondary English names in Chinese and restore exact English metadata', () => {
  const element = React.createElement(TalentCard, { template, onHire: () => undefined, onClick: () => undefined })
  const zh = renderInLocale(element, 'zh-CN')
  assert.match(zh, /投资研究员/)
  assert.match(zh, /财务与金融/)
  assert.match(zh, /tm-card-original-name[^>]*lang="en"[^>]*>Investment Researcher/)
  assert.match(zh, /招聘 →/)
  const en = renderInLocale(element, 'en')
  assert.ok(en.includes(template.description))
  assert.doesNotMatch(en, /投资研究员|tm-card-original-name/)
  assert.match(en, /Hire →/)
})

test('Chinese detail controls and expandable original English preserve role names', () => {
  const element = React.createElement(TalentDetailModal, {
    template, vacantRoles: [vacancy], onHire: () => undefined, onClose: () => undefined,
  })
  const zh = renderInLocale(element, 'zh-CN')
  assert.match(zh, /<details class="tm-original-english"><summary>英文原文<\/summary>/)
  assert.ok(zh.includes(template.description))
  for (const label of ['专业领域', '标签', '推荐执行器', '招聘至岗位', '招聘至选中岗位']) assert.ok(zh.includes(label))
  assert.ok(zh.includes(vacancy.name))
  assert.match(zh, /aria-label="关闭"/)
  const en = renderInLocale(element, 'en')
  assert.ok(en.includes(template.description))
  assert.doesNotMatch(en, /tm-original-english/)
  assert.match(en, /Hire to selected role/)
})

test('marketplace counts, categories, search and empty text follow the locale', () => {
  const props = { templates: [template], vacantRoles: [vacancy], hiringTemplateId: null,
    readOnly: false, onHireTalent: () => undefined }
  const zh = renderInLocale(React.createElement(EmployeesMarketplace, props), 'zh-CN')
  for (const label of ['1 个角色模板', '1 个空缺岗位', '财务与金融', '搜索中英文角色名称、简介或专业领域']) assert.ok(zh.includes(label))
  const empty = renderInLocale(React.createElement(EmployeesMarketplace, { ...props, templates: [] }), 'zh-CN')
  assert.match(empty, /暂无角色模板。/)
  const en = renderInLocale(React.createElement(EmployeesMarketplace, props), 'en')
  assert.match(en, /Talent Templates/)
  assert.match(en, /Search talent templates/)
  assert.match(en, /1 talent template/)
  assert.match(en, /1 vacant role/)
  assert.equal(talentMessages('zh-CN').noResults, '没有找到匹配的角色模板。')
})

test('hiring modal localizes template and controls without renaming vacant roles', () => {
  const props = { open: true, template, vacantRoles: [vacancy], onConfirm: () => undefined, onClose: () => undefined }
  const zh = renderInLocale(React.createElement(HireToRoleModal, props), 'zh-CN')
  assert.match(zh, /招聘 投资研究员/)
  assert.match(zh, /招聘至选中岗位/)
  assert.match(zh, /取消/)
  assert.ok(zh.includes(vacancy.name))
  const en = renderInLocale(React.createElement(HireToRoleModal, props), 'en')
  assert.match(en, /Hire Investment Researcher/)
  assert.match(en, /Hire to selected role/)
  assert.match(en, /Cancel/)
})
