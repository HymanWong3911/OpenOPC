import { test } from 'node:test'
import assert from 'node:assert/strict'
import { workspaceText } from './workspaceMessages'
test('runtime and toast display translations preserve source values and restore English', () => {
  const examples = [ ['3 agents working','3 个智能体工作中'], ['Running shell','正在运行 shell'], ['12m ago','12分钟前'], ['company/corporate','公司 / 企业'], ['Saved "客户团队"','已保存「客户团队」'], ['Save failed: E_LOCKED','保存失败：E_LOCKED'], ['pending','待处理'] ]
  for (const [source, expected] of examples) {
    assert.equal(workspaceText(source, 'zh-CN'), expected)
    assert.equal(workspaceText(source, 'en'), source)
  }
  assert.equal(workspaceText('用户自定义内容', 'zh-CN'), '用户自定义内容')
  assert.equal(workspaceText('constructor', 'zh-CN'), 'constructor')
})
