import { useRef, useState } from 'react'
import type { OrgCreateMemberInput, OrgSavedCreatePayload, TalentTemplate } from '../types/visual'
import { useI18n } from '../i18n'
import { getTalentPresentation } from '../lib/talentLocalization'
import { TEAM_PRESETS, buildTeamPresetMembers, getPresetMissingTemplates } from './teamPresetCatalog'
import './team-presets.css'

interface TeamPresetsProps {
  templates: TalentTemplate[]
  pending?: boolean
  result?: OrgSavedCreatePayload | null
  onCreate?: (name: string, members: OrgCreateMemberInput[]) => void
}

export function TeamPresets({ templates, pending, result, onCreate }: TeamPresetsProps) {
  const { t, locale } = useI18n()
  const [filter, setFilter] = useState<'all' | 'industry' | 'task'>('all')
  const [selectedId, setSelectedId] = useState(TEAM_PRESETS[0].id)
  const [customName, setCustomName] = useState('')
  const previewRef = useRef<HTMLElement | null>(null)
  const selected = TEAM_PRESETS.find(item => item.id === selectedId) ?? TEAM_PRESETS[0]
  const missing = getPresetMissingTemplates(selected, templates)
  const visible = TEAM_PRESETS.filter(item => filter === 'all' || item.kind === filter)
  const selectPreset = (id: string) => { setSelectedId(id); setCustomName('') }

  return (
    <section className="team-presets" aria-labelledby="team-presets-title">
      <header className="team-presets-header">
        <p className="team-presets-eyebrow">{t('teamPresets.eyebrow')}</p>
        <h2 id="team-presets-title">{t('teamPresets.title')}</h2>
        <p>{t('teamPresets.description')}</p>
      </header>
      <div className="team-presets-filters" role="group" aria-label={t('teamPresets.filter')}>
        {(['all', 'industry', 'task'] as const).map(kind => (
          <button key={kind} type="button" aria-pressed={filter === kind} disabled={pending} onClick={() => {
            setFilter(kind)
            if (kind !== 'all' && selected.kind !== kind) selectPreset(TEAM_PRESETS.find(item => item.kind === kind)!.id)
          }}>{t(`teamPresets.${kind}`)}</button>
        ))}
      </div>
      <div className="team-presets-grid">
        {visible.map(preset => (
          <button key={preset.id} type="button" className="team-preset-card" aria-pressed={selectedId === preset.id} disabled={pending} onClick={() => {
            selectPreset(preset.id)
            requestAnimationFrame(() => previewRef.current?.scrollIntoView({ block: 'start' }))
          }}>
            <span className="team-preset-card-meta">{t(`teamPresets.${preset.kind}`)} · {t('teamPresets.memberCount', { count: preset.members.length })}</span>
            <strong>{preset.name[locale]}</strong>
            <span className="team-preset-card-description">{preset.description[locale]}</span>
            <span className="team-preset-card-output">{preset.output[locale]}</span>
            <span className="team-preset-card-action">{t('teamPresets.view')} <span aria-hidden>↗</span></span>
          </button>
        ))}
      </div>
      <section className="team-preset-preview" ref={previewRef} aria-label={t('teamPresets.preview')}>
        <div className="team-preset-preview-heading"><h3>{selected.name[locale]}</h3><span>{t('teamPresets.memberCount', { count: selected.members.length })}</span></div>
        <p className="team-preset-preview-hint">{t('teamPresets.previewHint')}</p>
        <ol className="team-preset-members">
          {selected.members.map((item, index) => {
            const talent = templates.find(template => template.template_id === item.templateId)
            return (
              <li key={item.templateId}>
                <span className="team-preset-member-number">{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{item.role[locale]}</strong><span className="team-preset-member-source">{talent ? getTalentPresentation(talent, locale).name : t('teamPresets.missingMember')}</span><p>{item.responsibility[locale]}</p></div>
              </li>
            )
          })}
        </ol>
        <div className="team-preset-create">
          <label><span>{t('teamPresets.name')}</span><input value={customName} disabled={pending} onChange={event => setCustomName(event.target.value)} placeholder={selected.name[locale]} /></label>
          <button type="button" className="btn btn-primary" disabled={pending || missing.length > 0 || !onCreate} onClick={() => onCreate?.(customName.trim() || selected.name[locale], buildTeamPresetMembers(selected, locale))}>
            {pending ? t('teamPresets.creating') : t('teamPresets.create')}
          </button>
        </div>
        {missing.length > 0 && <p role="status" className="team-preset-warning">{t('teamPresets.missing', { count: missing.length })}</p>}
        {result?.ok === false && <p role="alert" className="team-preset-warning">{result.error || t('teamPresets.failed')}</p>}
        <p className="team-preset-create-hint">{t('teamPresets.createHint')}</p>
      </section>
    </section>
  )
}
