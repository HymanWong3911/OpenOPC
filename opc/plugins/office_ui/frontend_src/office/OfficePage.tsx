import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PhaserGame } from '../game/PhaserGame'
import type { GameBridge } from '../game/GameBridge'
import { getOffices } from '../game/map/OfficeStore'
import { getOfficeDeskSeats } from '../game/map/InteractionZones'
import { useI18n } from '../i18n'
import type { AgentInfo } from '../types/visual'

const VISUAL_REFRESH_MS = 300

/**
 * Keep Phaser-derived React chrome local to the Office page.  Game events can
 * arrive at token/runtime frequency; a bounded local revision prevents those
 * events from invalidating App and the active Workspace tree.
 */
function useOfficeVisualRevision(bridge: GameBridge, active: boolean): number {
  const [revision, setRevision] = useState(0)
  const activeRef = useRef(active)
  activeRef.current = active

  useEffect(() => {
    let timer: number | null = null
    const schedule = () => {
      if (!activeRef.current || timer !== null) return
      timer = window.setTimeout(() => {
        timer = null
        if (activeRef.current) setRevision(value => value + 1)
      }, VISUAL_REFRESH_MS)
    }
    bridge.on('eventApplied', schedule)
    bridge.on('snapshotApplied', schedule)
    bridge.on('officeChanged', schedule)
    return () => {
      bridge.off('eventApplied', schedule)
      bridge.off('snapshotApplied', schedule)
      bridge.off('officeChanged', schedule)
      if (timer !== null) window.clearTimeout(timer)
    }
  }, [bridge])

  useEffect(() => {
    if (active) setRevision(value => value + 1)
  }, [active])

  return revision
}

interface OfficePageProps {
  bridge: GameBridge
  active: boolean
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  agents: AgentInfo[]
  execMode: string
  companyProfile: string
  modeLabel: string
  isOrgMode: boolean
  deletingAgentId: string | null
  onMoveAgent: (agentId: string, officeId: string) => void
  onDeleteAgent: (agentId: string) => void
}

export const OfficePage = memo(function OfficePage({
  bridge,
  active,
  sidebarCollapsed,
  onToggleSidebar,
  agents,
  execMode,
  companyProfile,
  modeLabel,
  isOrgMode,
  deletingAgentId,
  onMoveAgent,
  onDeleteAgent,
}: OfficePageProps) {
  const { t, translateMaybe } = useI18n()
  const revision = useOfficeVisualRevision(bridge, active)
  const [showSubagents, setShowSubagents] = useState(true)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [editingOfficeName, setEditingOfficeName] = useState<string | null>(null)
  const [officeNameDraft, setOfficeNameDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const roomRefs = useRef(new Map<string, HTMLElement>())

  useEffect(() => {
    const select = (agentId: string) => { setSelectedAgentId(agentId) }
    bridge.on('agentSelected', select)
    return () => { bridge.off('agentSelected', select) }
  }, [bridge])

  const hasRuntimeMain = agents.some(agent => agent.agent_id === 'openopc-main')
  const allCards = useMemo(
    // An empty scene's decorative fallback is not a real team member.
    () => bridge.getCharacterCards().filter(card => card.id !== 'openopc-main' || hasRuntimeMain),
    [bridge, revision, hasRuntimeMain],
  )
  const cards = useMemo(() => {
    const visible = showSubagents ? allCards : allCards.filter(card => !card.isSubagent)
    return visible.slice().sort((left, right) => left.displayName.localeCompare(right.displayName))
  }, [allCards, showSubagents])
  const offices = useMemo(() => getOffices(), [revision])
  const memberState = (card: (typeof cards)[number]) => {
    const agent = agents.find(item => item.agent_id === card.id)
    const state = agent?.runtime_status ?? agent?.status ?? card.state
    return state === 'type' ? 'tool_active' : state === 'think' || state === 'reflect' ? 'reflecting' : state
  }
  const memberTool = (card: (typeof cards)[number]) => {
    const agent = agents.find(item => item.agent_id === card.id)
    return agent ? agent.current_tool : card.currentTool
  }
  const activeStates = new Set(['running', 'working', 'thinking', 'tool_active', 'reflecting'])
  const activeMembers = cards.filter(card => activeStates.has(memberState(card))).length
  const seatIds = new Set(offices.flatMap(office => getOfficeDeskSeats(office.id).map(seat => seat.id)))
  const seatCount = seatIds.size
  const occupiedSeatCount = new Set(allCards.map(card => card.seatId).filter((id): id is string => !!id && seatIds.has(id))).size
  const selectedCard = cards.find(card => card.id === selectedAgentId) ?? null
  const selectedAgentSeats = useMemo(
    () => selectedCard ? bridge.getSeatsForOffice(selectedCard.officeId) : [],
    [bridge, revision, selectedCard],
  )

  const selectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId)
  }, [])

  const renameOffice = useCallback((officeId: string) => {
    const name = officeNameDraft.trim()
    if (name) bridge.renameOffice(officeId, name)
    setEditingOfficeName(null)
  }, [bridge, officeNameDraft])

  const assignAgent = useCallback((officeId: string, agentId: string) => {
    bridge.assignAgentToOffice(agentId, officeId)
    onMoveAgent(agentId, officeId)
  }, [bridge, onMoveAgent])

  const changeSeat = useCallback((agentId: string, seatId: string) => {
    bridge.changeAgentSeat(agentId, seatId)
  }, [bridge])

  return (
    <main className={`main-grid${active ? '' : ' hidden'}${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
      <section className="canvas-wrap office-visual-host">
        {/* The scene currently owns office/seat synchronization; keep it mounted behind the team UI. */}
        <div className="office-pixel-layer is-concealed" aria-hidden="true">
          <PhaserGame bridge={bridge} active={active} />
        </div>
        <div className="office-view-switch" role="group" aria-label={t('officeView.filters')}>
          <button className="office-subagent-filter" aria-pressed={showSubagents} onClick={() => setShowSubagents(value => !value)}>{showSubagents ? t('office.hideSub') : t('office.showSub')}</button>
        </div>
          <div className="office-overview">
            <header className="office-overview-header">
              <p className="office-overview-eyebrow">{t('officeView.eyebrow')}</p>
              <h1>{t('officeView.title')}</h1>
              <p>{t('officeView.description')}</p>
            </header>
            <div className="office-overview-metrics">
              <article><strong>{cards.length}</strong><span>{t('officeView.members')}</span></article>
              <article><strong>{activeMembers}</strong><span>{t('officeView.active')}</span></article>
              <article><strong>{Math.max(0, seatCount - occupiedSeatCount)}</strong><span>{t('officeView.availableSeats')}</span></article>
            </div>
            <div className="office-room-grid">
              {offices.map(office => {
                const seats = getOfficeDeskSeats(office.id)
                const members = allCards.filter(card => card.officeId === office.id)
                const occupiedSeats = new Set(members.map(card => card.seatId).filter(id => seats.some(seat => seat.id === id))).size
                return (
                  <section className="office-room-card" key={office.id} ref={node => { if (node) roomRefs.current.set(office.id, node); else roomRefs.current.delete(office.id) }}>
                    <div className="office-room-card-heading"><h2>{office.name}</h2><span>{t('officeView.occupancy', { used: occupiedSeats, total: seats.length })}</span></div>
                    <div className="office-seat-grid">
                      {seats.map((seat, index) => {
                        const member = members.find(card => card.seatId === seat.id)
                        return member && (showSubagents || !member.isSubagent) ? (
                          <button className={`office-seat occupied${selectedAgentId === member.id ? ' selected' : ''}`} key={seat.id} onClick={() => selectAgent(member.id)} title={`${member.displayName} · ${seat.id}`}>
                            <span className="office-seat-label">{String(index + 1).padStart(2, '0')}</span>
                            <span className="office-seat-name">{member.displayName}</span>
                          </button>
                        ) : (
                          <div className={`office-seat ${member ? 'occupied' : 'vacant'}`} key={seat.id} title={seat.id}><span className="office-seat-label">{String(index + 1).padStart(2, '0')}</span><span className="office-seat-name">{t(member ? 'officeView.occupied' : 'officeView.vacant')}</span></div>
                        )
                      })}
                    </div>
                  </section>
                )
              })}
            </div>
            <section className="office-member-section">
              <h2>{t('officeView.members')}</h2><p>{t('officeView.memberHint')}</p>
              <div className="office-member-table">
                <div className="office-member-table-header" aria-hidden="true">
                  {(['member', 'state', 'task', 'tool', 'room'] as const).map(key => <span key={key}>{t(`officeView.${key}`)}</span>)}
                </div>
                {cards.map(card => {
                  const state = memberState(card)
                  const statusClass = activeStates.has(state) ? 'is-active' : state === 'error' || state === 'failed' ? 'is-error' : state === 'done' ? 'is-done' : ''
                  return (
                    <button className={`office-member-row${selectedAgentId === card.id ? ' selected' : ''}`} key={card.id} onClick={() => selectAgent(card.id)}>
                      <span className="office-member-identity"><span className="office-member-avatar" aria-hidden="true">{card.displayName.slice(0, 2).toUpperCase()}</span><span>{card.displayName}</span></span>
                      <span className={`office-member-status ${statusClass}`}>{translateMaybe('agent.status', state) || state}</span>
                      <span className="office-member-task">{card.taskSummary || t('officeView.noTask')}</span>
                      <span className="office-member-tool">{memberTool(card) || '—'}</span>
                      <span>{offices.find(office => office.id === card.officeId)?.name || '—'}</span>
                    </button>
                  )
                })}
                {cards.length === 0 && <p className="office-member-empty">{t('officeView.noMembers')}</p>}
              </div>
            </section>
          </div>
        <button
          className="sidebar-collapse-btn"
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? t('office.showSidePanel') : t('office.hideSidePanel')}
          aria-label={sidebarCollapsed ? t('office.showSidePanel') : t('office.hideSidePanel')}
        >
          <span className="collapse-glyph">{sidebarCollapsed ? '❮' : '❯'}</span>
        </button>
      </section>

      <aside className="sidebar">
        <div className="sidebar-body">
          <div className="team-panel">
            <div className="mode-info-bar">
              <span className="mode-badge">{modeLabel}</span>
              <span className="mode-hint">
                {isOrgMode ? t('office.modeHint.org') : t('office.modeHint.switch')}
              </span>
            </div>

            <div className="section-label">
              {t('office.offices')} <span className="count-badge">{offices.length}</span>
            </div>
            <div className="office-cards">
              {offices.map(office => {
                const seats = getOfficeDeskSeats(office.id)
                const deskCount = seats.length
                const assignedCards = cards.filter(card => card.officeId === office.id)
                const occupiedCount = new Set(allCards.filter(card => card.officeId === office.id && seats.some(seat => seat.id === card.seatId)).map(card => card.seatId)).size
                const otherAgents = cards.filter(card => card.officeId !== office.id && !card.isSubagent)
                return (
                  <div key={office.id} className="office-card" onClick={() => roomRefs.current.get(office.id)?.scrollIntoView({ block: 'nearest' })}>
                    <div className="office-card-header">
                      {editingOfficeName === office.id ? (
                        <input
                          className="office-name-input"
                          value={officeNameDraft}
                          onChange={event => setOfficeNameDraft(event.target.value)}
                          onBlur={() => renameOffice(office.id)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') renameOffice(office.id)
                            if (event.key === 'Escape') setEditingOfficeName(null)
                          }}
                          autoFocus
                          onClick={event => event.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span className="office-name">{office.name}</span>
                          <button
                            className="office-edit-btn"
                            title={t('office.rename')}
                            onClick={event => {
                              event.stopPropagation()
                              setEditingOfficeName(office.id)
                              setOfficeNameDraft(office.name)
                            }}
                          >
                            ✎
                          </button>
                        </>
                      )}
                      <span className="office-capacity">{occupiedCount}/{deskCount}</span>
                    </div>
                    <div className="office-agents">
                      {assignedCards.map(card => (
                        <span
                          key={card.id}
                          className="office-agent-chip"
                          title={`${card.displayName} — ${card.seatId ?? t('office.noSeat')}`}
                          onClick={event => { event.stopPropagation(); selectAgent(card.id) }}
                        >
                          {card.displayName.slice(0, 8)}
                        </span>
                      ))}
                      {isOrgMode && occupiedCount < deskCount && otherAgents.length > 0 && (
                        <select
                          className="assign-dropdown"
                          value=""
                          onClick={event => event.stopPropagation()}
                          onChange={event => { if (event.target.value) assignAgent(office.id, event.target.value) }}
                        >
                          <option value="">{t('office.moveHere')}</option>
                          {otherAgents.map(agent => (
                            <option key={agent.id} value={agent.id}>
                              {agent.displayName} ({offices.find(candidate => candidate.id === cards.find(card => card.id === agent.id)?.officeId)?.name ?? '?'})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="section-label">
              {t('office.activeAgents')} <span className="count-badge">{agents.length}</span>
            </div>
            <div className="agent-list">
              {agents.map(agent => (
                <div key={agent.agent_id} className={`agent-row ${selectedAgentId === agent.agent_id ? 'selected' : ''}`}>
                  <button className="agent-row-main" onClick={() => selectAgent(agent.agent_id)}>
                    <span className={`dot ${agent.status}`} />
                    <div className="agent-info">
                      <span className="agent-name">{agent.name}</span>
                      <span className="agent-spec">{agent.specialties.slice(0, 2).join(' · ') || t('common.general')}</span>
                    </div>
                  </button>
                  {isOrgMode && (
                    deletingAgentId === agent.agent_id
                      ? <span className="agent-del" style={{ pointerEvents: 'none' }}><span className="spinner-inline" /></span>
                      : confirmDeleteId === agent.agent_id
                        ? (
                          <span className="del-confirm">
                            <span className="del-confirm-label">{t('office.deleteQuestion')}</span>
                            <button
                              className="del-confirm-yes"
                              onClick={() => { setConfirmDeleteId(null); onDeleteAgent(agent.agent_id) }}
                            >
                              {t('common.yes')}
                            </button>
                            <button className="del-confirm-no" onClick={() => setConfirmDeleteId(null)}>
                              {t('common.no')}
                            </button>
                          </span>
                        )
                        : (
                          <button
                            className="agent-del"
                            title={t('office.removeAgent', { name: agent.name })}
                            onClick={() => setConfirmDeleteId(agent.agent_id)}
                          >
                            ×
                          </button>
                        )
                  )}
                </div>
              ))}
              {agents.length === 0 && <div className="empty-state">{t('office.emptyAgents')}</div>}
            </div>

            {selectedCard && (
              <div className="agent-detail">
                <div className="agent-detail-name">{selectedCard.displayName}</div>
                <div className="agent-detail-row">
                  <span className="detail-label">{t('common.state')}</span>
                  <span className="detail-value">{translateMaybe('agent.status', memberState(selectedCard)) || memberState(selectedCard)}</span>
                </div>
                <div className="agent-detail-row">
                  <span className="detail-label">{t('common.tool')}</span>
                  <span className="detail-value">{memberTool(selectedCard) || '—'}</span>
                </div>
                <div className="agent-detail-row">
                  <span className="detail-label">{t('officeView.task')}</span>
                  <span className="detail-value">{selectedCard.taskSummary ?? '—'}</span>
                </div>
                <div className="agent-detail-row">
                  <span className="detail-label">{t('app.page.office')}</span>
                  <select
                    className="detail-select"
                    value={selectedCard.officeId}
                    onChange={event => assignAgent(event.target.value, selectedCard.id)}
                    disabled={!isOrgMode}
                  >
                    {offices.map(office => <option key={office.id} value={office.id}>{office.name}</option>)}
                  </select>
                </div>
                <div className="agent-detail-row">
                  <span className="detail-label">{t('common.seat')}</span>
                  <select
                    className="detail-select"
                    value={selectedCard.seatId ?? ''}
                    onChange={event => { if (event.target.value) changeSeat(selectedCard.id, event.target.value) }}
                    disabled={!isOrgMode}
                  >
                    <option value="">—</option>
                    {selectedAgentSeats.map(seat => {
                      const label = seat.id.replace(/^office-\d+-/, '').replace('-', ' ').replace(/\b\w/g, char => char.toUpperCase())
                      const taken = seat.assigned && seat.assignedTo !== selectedCard.id
                      return (
                        <option key={seat.id} value={seat.id} disabled={taken}>
                          {label}{taken ? ` (${seat.assignedTo})` : seat.assignedTo === selectedCard.id ? ' ✓' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>
            )}

            {cards.length > agents.length && (
              <>
                <div className="section-label">
                  {t('office.characters')}
                  <button className="inline-btn" onClick={() => setShowSubagents(value => !value)}>
                    {showSubagents ? t('office.hideSub') : t('office.showSub')}
                  </button>
                </div>
                <div className="agent-list">
                  {cards.filter(card => !agents.some(agent => agent.agent_id === card.id)).map(card => (
                    <button
                      key={card.id}
                      className={`agent-row-simple ${selectedAgentId === card.id ? 'selected' : ''}`}
                      onClick={() => selectAgent(card.id)}
                    >
                      {card.isSubagent && <span className="sub-badge">{t('office.subBadge')}</span>}
                      <span className="agent-name">{card.displayName}</span>
                      <span className="agent-spec">{card.state}{card.currentTool ? ` · ${card.currentTool}` : ''}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </main>
  )
})
