import React, { useEffect, useState } from 'react'
import type { OrgRole, TalentTemplate, HireTalentHandler } from '../types/visual'
import { asRoleId, asTemplateId } from '../types/visual'
import { useI18n } from '../i18n'
import { getTalentPresentation, getTalentTagLabel, talentMessages } from '../lib/talentLocalization'

interface TalentDetailModalProps {
  template: TalentTemplate
  vacantRoles: OrgRole[]
  hiringId?: string | null
  readOnly?: boolean
  onHire: HireTalentHandler
  onClose: () => void
}

export function TalentDetailModal({
  template: t, vacantRoles, hiringId, readOnly, onHire, onClose,
}: TalentDetailModalProps) {
  const { locale } = useI18n()
  const presentation = getTalentPresentation(t, locale)
  const messages = talentMessages(locale)
  const showOriginal = locale === 'zh-CN' && (presentation.name !== t.name || presentation.description !== t.description || presentation.vibe !== t.vibe)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const isHiring = hiringId === t.template_id
  const noVacancies = vacantRoles.length === 0
  const canHire = !readOnly && !isHiring && !noVacancies && selectedRoleId !== ''

  useEffect(() => {
    setSelectedRoleId('')
  }, [t.template_id])

  const handleHire = () => {
    if (!canHire) return
    onHire(asTemplateId(t.template_id), asRoleId(selectedRoleId))
  }

  return (
    <div className="tm-detail-overlay" onClick={onClose}>
      <div className="tm-detail-modal" data-locale={locale} role="dialog" aria-modal="true" aria-label={presentation.name} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="tm-detail-header">
          {t.emoji && <span className="tm-detail-emoji">{t.emoji}</span>}
          <div>
            <h2 className="tm-detail-name">{presentation.name}</h2>
            {showOriginal && <span className="tm-detail-original-name" lang="en">{t.name}</span>}
            <span className="tm-detail-category">{presentation.category}</span>
          </div>
          <button className="tm-detail-close" onClick={onClose} aria-label={messages.close}>&times;</button>
        </div>

        {/* Body */}
        <div className="tm-detail-body">
          {presentation.vibe && (
            <blockquote className="tm-detail-vibe">"{presentation.vibe}"</blockquote>
          )}

          {presentation.description && (
            <p className="tm-detail-desc">{presentation.description}</p>
          )}

          {showOriginal && (
            <details className="tm-original-english">
              <summary>{messages.originalEnglish}</summary>
              <div className="tm-original-english-body" lang="en">
                <h3>{t.name}</h3>
                {t.vibe && <blockquote>"{t.vibe}"</blockquote>}
                {t.description && <p>{t.description}</p>}
              </div>
            </details>
          )}

          {t.domains.length > 0 && (
            <div className="tm-detail-section">
              <div className="tm-detail-label">{messages.domains}</div>
              <div className="tm-detail-tags">
                {t.domains.map(d => <span key={d} className="org-domain-tag">{getTalentTagLabel(d, locale)}</span>)}
              </div>
            </div>
          )}

          {t.tags.length > 0 && (
            <div className="tm-detail-section">
              <div className="tm-detail-label">{messages.tags}</div>
              <div className="tm-detail-tags">
                {t.tags.map(tag => <span key={tag} className="org-tool-tag">{getTalentTagLabel(tag, locale)}</span>)}
              </div>
            </div>
          )}

          {t.preferred_external_agent && (
            <div className="tm-detail-section">
              <div className="tm-detail-label">{messages.recommendedAgent}</div>
              <span className="tm-card-agent-badge">{t.preferred_external_agent}</span>
            </div>
          )}

          {!readOnly && (
            <div className="tm-detail-section">
              <div className="tm-detail-label">{messages.hireIntoRole}</div>
              {noVacancies ? (
                <p className="tm-detail-vacancy-empty">
                  {messages.noVacancies} {messages.addRoleFirst}
                </p>
              ) : (
                <div className="tm-detail-role-list" role="listbox" aria-label={messages.vacantRoles}>
                  {vacantRoles.map(role => {
                    const selected = role.role_id === selectedRoleId
                    return (
                      <button
                        key={role.role_id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`tm-detail-role-row${selected ? ' is-selected' : ''}`}
                        onClick={() => setSelectedRoleId(role.role_id)}
                      >
                        <span className="tm-detail-role-name">{role.name}</span>
                        {role.responsibility && (
                          <span className="tm-detail-role-resp">{role.responsibility}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hire footer */}
        {!readOnly && (
          <div className="tm-detail-footer">
            <button
              className="tm-detail-hire-btn"
              disabled={!canHire}
              onClick={handleHire}
            >
              {isHiring ? <><span className="spinner-inline" /> {messages.hiring}</> : messages.hireToSelectedRole}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
