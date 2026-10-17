import type { OrgCreateMemberInput, TalentTemplate } from '../types/visual'

type LocalizedText = { en: string; 'zh-CN': string }
export interface TeamPresetMember {
  templateId: string
  role: LocalizedText
  responsibility: LocalizedText
}
export interface TeamPreset {
  id: string
  kind: 'industry' | 'task'
  name: LocalizedText
  description: LocalizedText
  output: LocalizedText
  members: TeamPresetMember[]
}
const text = (zh: string, en: string): LocalizedText => ({ 'zh-CN': zh, en })
const member = (templateId: string, zhRole: string, enRole: string, zhResponsibility: string, enResponsibility: string): TeamPresetMember => ({
  templateId, role: text(zhRole, enRole), responsibility: text(zhResponsibility, enResponsibility),
})

export const TEAM_PRESETS: TeamPreset[] = [
  {
    id: 'software', kind: 'industry', name: text('软件开发团队', 'Software development team'),
    description: text('面向网站、应用和内部工具，从需求梳理推进到开发与验收。', 'Build websites, applications, and internal tools from requirements through implementation and acceptance.'),
    output: text('需求文档 · 前后端实现 · 测试与交付', 'Requirements · Frontend and backend · Tested delivery'),
    members: [
      member('agency-product-manager', '产品负责人', 'Product lead', '梳理目标、用户需求与优先级，定义交付范围及验收标准，统筹团队决策。', 'Define goals, user needs, priorities, scope, and acceptance criteria; coordinate team decisions.'),
      member('agency-engineering-backend-architect', '后端架构师', 'Backend architect', '设计接口和数据模型，实现服务端逻辑并检查系统边界。', 'Design APIs and data models, implement backend behavior, and review system boundaries.'),
      member('agency-engineering-frontend-developer', '前端开发工程师', 'Frontend developer', '实现界面和交互，接入接口，检查可访问性与响应式显示。', 'Implement interfaces and interactions, integrate APIs, and verify accessibility and responsive layouts.'),
      member('agency-testing-test-automation-engineer', '测试工程师', 'Test engineer', '围绕验收标准设计测试，验证关键流程并记录缺陷和复测结果。', 'Test acceptance criteria and critical flows; report defects and verify fixes.'),
    ],
  },
  {
    id: 'ecommerce', kind: 'industry', name: text('电商增长团队', 'E-commerce growth team'),
    description: text('适合电商与零售业务，协同商品运营、内容、投放和数据复盘。', 'Coordinate merchandising, content, paid campaigns, and measurement for e-commerce and retail.'),
    output: text('运营方案 · 营销素材 · 增长实验与复盘', 'Operations plan · Campaign content · Growth experiments and review'),
    members: [
      member('agency-marketing-china-ecommerce-operator', '电商运营负责人', 'E-commerce operations lead', '制定店铺和商品运营计划，组织活动节奏，统筹团队交付。', 'Plan store and merchandising operations, coordinate campaigns, and manage delivery.'),
      member('agency-marketing-growth-hacker', '增长策划', 'Growth strategist', '梳理转化路径，设计可衡量的获客和留存实验，依据结果调整策略。', 'Review conversion paths, design measurable acquisition and retention experiments, and iterate from results.'),
      member('agency-marketing-content-creator', '营销内容策划', 'Marketing content creator', '围绕产品价值和目标受众制作营销文案与渠道内容。', 'Create campaign copy and channel content around product value and target audiences.'),
      member('agency-paid-media-paid-social-strategist', '广告投放策划', 'Paid social strategist', '制定付费社交渠道的受众、素材和预算测试方案，评估投放表现。', 'Plan paid social audiences, creative, and budget tests; evaluate campaign performance.'),
      member('agency-support-analytics-reporter', '运营数据分析', 'Operations data analyst', '汇总运营和投放数据，核对口径，形成结果复盘与改进建议。', 'Consolidate operations and campaign data, check measurement definitions, and report findings.'),
    ],
  },
  {
    id: 'content', kind: 'industry', name: text('内容运营团队', 'Content operations team'),
    description: text('面向媒体、品牌账号和内容业务，协调选题、创作、视频与品牌表达。', 'Coordinate topics, writing, video, and brand expression for media and brand channels.'),
    output: text('内容日历 · 图文与视频方案 · 品牌审核', 'Content calendar · Written and video content plans · Brand review'),
    members: [
      member('agency-marketing-social-media-strategist', '内容运营负责人', 'Content operations lead', '制定账号策略、渠道分工和内容日历，明确各项内容的目标。', 'Define channel strategy, responsibilities, content calendars, and goals for each piece.'),
      member('agency-marketing-content-creator', '内容创作者', 'Content creator', '依据选题与真实素材撰写内容，适配平台和受众的表达习惯。', 'Create content from selected topics and real source material, adapting it to each audience and platform.'),
      member('agency-marketing-short-video-editing-coach', '短视频策划与剪辑顾问', 'Short-video editing advisor', '设计视频结构和镜头节奏，提供剪辑方案及成片改进建议。', 'Plan video structure and pacing, recommend edits, and review finished cuts.'),
      member('agency-design-brand-guardian', '品牌表达审核', 'Brand expression reviewer', '检查内容语气、视觉使用与品牌口径，整理需修订的项目。', 'Review tone, visual usage, and brand consistency; identify revisions.'),
    ],
  },
  {
    id: 'brand', kind: 'task', name: text('品牌设计团队', 'Brand design team'),
    description: text('适合品牌升级、活动视觉和产品界面项目，把用户理解连接到设计与文案。', 'Connect user insight with design and copy for brand refreshes, campaign visuals, and product interfaces.'),
    output: text('品牌表达规范 · 设计方案 · 应用文案', 'Brand expression guidelines · Design proposals · Application copy'),
    members: [
      member('agency-design-brand-guardian', '品牌负责人', 'Brand lead', '梳理品牌表达和一致性要求，审核视觉与文案的使用规则。', 'Define brand expression and consistency requirements; review visual and copy guidelines.'),
      member('agency-design-ui-designer', '视觉与界面设计师', 'Visual and interface designer', '根据项目需求设计视觉布局、界面组件与应用方案。', 'Design visual layouts, interface components, and application concepts for the project.'),
      member('agency-design-ux-researcher', '用户研究员', 'User researcher', '研究目标用户、使用场景与反馈，为设计决策提供依据。', 'Research audiences, usage contexts, and feedback to inform design decisions.'),
      member('copywriter', '品牌文案', 'Brand copywriter', '撰写品牌信息和应用文案，统一表达风格并核对事实依据。', 'Write brand messaging and application copy, align the voice, and check factual support.'),
    ],
  },
  {
    id: 'research', kind: 'task', name: text('市场调研团队', 'Market research team'),
    description: text('适合新市场、产品机会和竞品研究，将资料、用户与数据整理为可判断的结论。', 'Combine evidence, user insight, and data to assess markets, product opportunities, and competitors.'),
    output: text('资料与来源 · 趋势和用户洞察 · 研究报告', 'Sources and evidence · Trends and user insight · Research report'),
    members: [
      member('agency-research-synthesist', '研究负责人', 'Research lead', '界定研究问题，整合不同来源，区分事实与推断并形成结论。', 'Define research questions, synthesize sources, distinguish facts from inference, and report conclusions.'),
      member('agency-product-trend-researcher', '趋势研究员', 'Trend researcher', '追踪市场和产品趋势，分析机会及竞争变化。', 'Track market and product trends; analyze opportunities and competitive changes.'),
      member('agency-design-ux-researcher', '用户研究员', 'User researcher', '梳理用户需求与使用场景，设计研究方式并总结反馈。', 'Study user needs and usage contexts, plan research methods, and summarize feedback.'),
      member('agency-support-analytics-reporter', '研究数据分析', 'Research data analyst', '整理数据与资料口径，核对来源，支撑研究结果的对比和判断。', 'Consolidate data, check definitions and sources, and support research comparisons.'),
    ],
  },
  {
    id: 'delivery', kind: 'task', name: text('项目交付团队', 'Project delivery team'),
    description: text('适合跨岗位执行项目，围绕计划、协调、验收和沟通推进交付。', 'Coordinate cross-functional projects through planning, execution, acceptance, and communication.'),
    output: text('执行计划 · 进度与风险 · 验收与交接记录', 'Delivery plan · Progress and risks · Acceptance and handoff records'),
    members: [
      member('agency-project-manager-senior', '项目负责人', 'Project lead', '定义范围和里程碑，协调资源，管理风险与交付决策。', 'Define scope and milestones, coordinate resources, and manage risks and delivery decisions.'),
      member('agency-project-management-project-shepherd', '执行协调', 'Execution coordinator', '拆解任务，跟进依赖与进度，推动阻塞事项得到处理。', 'Break down tasks, track dependencies and progress, and help resolve blockers.'),
      member('agency-testing-test-results-analyzer', '验收分析', 'Acceptance analyst', '分析测试和交付证据，核对验收标准，整理缺陷与复测结果。', 'Analyze test and delivery evidence, check acceptance criteria, and document defects and retests.'),
      member('agency-project-management-meeting-notes-specialist', '沟通与归档', 'Communication and documentation', '整理会议决议、行动项和交接资料，明确责任人与后续事项。', 'Document decisions, action items, and handoffs with owners and follow-up work.'),
    ],
  },
]

export function buildTeamPresetMembers(preset: TeamPreset, locale: keyof LocalizedText): OrgCreateMemberInput[] {
  return preset.members.map((item, index) => ({
    name: item.role[locale], responsibility: item.responsibility[locale],
    template_id: item.templateId, reports_to_index: index === 0 ? null : 0,
  }))
}

export function getPresetMissingTemplates(preset: TeamPreset, templates: TalentTemplate[]): string[] {
  const available = new Set(templates.map(item => item.template_id))
  return preset.members.map(item => item.templateId).filter(id => !available.has(id))
}
