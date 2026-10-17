import assert from 'node:assert/strict'
import test from 'node:test'
import type { TalentTemplate } from '../types/visual'
import { TALENT_TRANSLATIONS } from '../lib/talentLocalization'
import { VisualSocketClient } from '../lib/wsClient'
import { TEAM_PRESETS, buildTeamPresetMembers, getPresetMissingTemplates } from './teamPresetCatalog'

test('all six team presets use available stable talent IDs and explicit responsibilities', () => {
  assert.equal(TEAM_PRESETS.length, 6)
  assert.equal(new Set(TEAM_PRESETS.map(item => item.id)).size, 6)
  for (const preset of TEAM_PRESETS) {
    assert.ok(preset.members.length >= 2)
    assert.equal(new Set(preset.members.map(item => item.templateId)).size, preset.members.length)
    for (const member of preset.members) {
      assert.ok(member.templateId in TALENT_TRANSLATIONS, member.templateId)
      for (const locale of ['en', 'zh-CN'] as const) {
        assert.ok(member.role[locale].trim())
        assert.ok(member.responsibility[locale].trim())
      }
    }
  }
})

test('language changes display roles while creation always preserves original template IDs and hierarchy', () => {
  for (const preset of TEAM_PRESETS) {
    const zh = buildTeamPresetMembers(preset, 'zh-CN')
    const en = buildTeamPresetMembers(preset, 'en')
    assert.deepEqual(zh.map(item => item.template_id), en.map(item => item.template_id))
    assert.notEqual(zh[0].name, en[0].name)
    assert.equal(zh[0].reports_to_index, null)
    assert.ok(zh.slice(1).every(item => item.reports_to_index === 0))
    zh[0].name = 'Edited role'
    assert.notEqual(preset.members[0].role['zh-CN'], 'Edited role')
  }
})

test('missing employees are reported before a team can be created', () => {
  const preset = TEAM_PRESETS[0]
  const available = preset.members.map(item => ({ template_id: item.templateId }) as TalentTemplate)
  assert.deepEqual(getPresetMissingTemplates(preset, available), [])
  assert.deepEqual(getPresetMissingTemplates(preset, available.slice(1)), [preset.members[0].templateId])
  assert.deepEqual(getPresetMissingTemplates(preset, []), preset.members.map(item => item.templateId))
})

test('one-click team creation sends the selected original employee IDs through the existing protocol', () => {
  const client = new VisualSocketClient('ws://unit.test', {})
  const members = buildTeamPresetMembers(TEAM_PRESETS[1], 'zh-CN')
  client.orgSavedCreate('Test team', members)
  const envelope = JSON.parse((client as unknown as { pendingQueue: string[] }).pendingQueue.pop() ?? '{}')
  assert.equal(envelope.type, 'org_saved_create')
  assert.equal(envelope.organization_name, 'Test team')
  assert.deepEqual(envelope.members, members)
  assert.deepEqual(envelope.members.map((item: { template_id: string }) => item.template_id), TEAM_PRESETS[1].members.map(item => item.templateId))
})
