import React, { useEffect, useState } from 'react'
import type { OrgRole, TalentTemplate, RoleId, TemplateId } from '../types/visual'
import { asRoleId, asTemplateId } from '../types/visual'
import { useI18n } from '../i18n'
import { getTalentPresentation, talentMessages } from '../lib/talentLocalization'

interface HireToRoleModalProps {
  open: boolean
  template: TalentTemplate | null
  vacantRoles: OrgRole[]
  onConfirm: (template: TemplateId, role: RoleId) => void
  onClose: () => void
}

export function HireToRoleModal({
  open, template, vacantRoles, onConfirm, onClose,
}: HireToRoleModalProps) {
  const { locale } = useI18n()
  const messages = talentMessages(locale)
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')

  useEffect(() => {
    if (open) setSelectedRoleId('')
  }, [open, template?.template_id])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !template) return null

  const presentation = getTalentPresentation(template, locale)
  const showOriginalName = locale === 'zh-CN' && presentation.name !== template.name
  const noVacancies = vacantRoles.length === 0
  const canConfirm = !noVacancies && selectedRoleId !== ''

  const handleConfirm = () => {
    if (!canConfirm) return
    onConfirm(asTemplateId(template.template_id), asRoleId(selectedRoleId))
  }

  return (
    <div className="htr-overlay" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="htr-modal" data-locale={locale} onMouseDown={event => event.stopPropagation()}>
        <header className="htr-header">
          <div>
            <h3 className="htr-title">{messages.hireTitle(presentation.name)}</h3>
            {showOriginalName && <p className="htr-original-name" lang="en">{template.name}</p>}
            <p className="htr-subtitle">{messages.pickRole}</p>
          </div>
          <button className="htr-close" type="button" onClick={onClose} aria-label={messages.close}>x</button>
        </header>

        <div className="htr-body">
          {noVacancies ? (
            <div className="htr-empty">
              <p className="htr-empty-title">{messages.noVacancies}</p>
              <p className="htr-empty-hint">
                {messages.addRoleFirst}
              </p>
            </div>
          ) : (
            <div className="htr-role-list" role="listbox" aria-label={messages.vacantRoles}>
              {vacantRoles.map(role => {
                const selected = role.role_id === selectedRoleId
                return (
                  <button
                    key={role.role_id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`htr-role-row${selected ? ' is-selected' : ''}`}
                    onClick={() => setSelectedRoleId(role.role_id)}
                  >
                    <span className="htr-role-name">{role.name}</span>
                    {role.responsibility && (
                      <span className="htr-role-resp">{role.responsibility}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <footer className="htr-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            {noVacancies ? messages.close : messages.cancel}
          </button>
          {!noVacancies && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {messages.hireToSelectedRole}
            </button>
          )}
        </footer>
      </div>
    </div>
  )
}
