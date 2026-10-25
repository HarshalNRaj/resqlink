import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Bell,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  FileText,
  Filter,
  HeartHandshake,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { getAccessToken } from './verification'

const API_URL = 'http://127.0.0.1:5000/api/admin'
const ROLE_LABELS = {
  volunteer: 'Volunteer',
  ngo: 'NGO / Ashram',
  blood_bank: 'Blood Bank',
}

function formatDate(value) {
  if (!value) return 'Date not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Date not available' : date.toLocaleString()
}

function StatusBadge({ status }) {
  const styles = {
    pending: 'admin-status-pending',
    approved: 'admin-status-approved',
    rejected: 'admin-status-rejected',
  }
  const Icon = status === 'approved'
    ? BadgeCheck
    : status === 'rejected'
      ? XCircle
      : Clock3

  return (
    <span className={`admin-status ${styles[status] || ''}`}>
      <Icon size={14} />
      {status || 'unknown'}
    </span>
  )
}

export default function AdminDashboard({ user, onLogout }) {
  const [applications, setApplications] = useState([])
  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [workingId, setWorkingId] = useState(null)
  const [notice, setNotice] = useState('')
  const [preview, setPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const token = useMemo(() => getAccessToken(), [])

  const loadApplications = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ role, status, q: query })
    try {
      const response = await fetch(`${API_URL}/applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      })
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load applications.')
      }
      setApplications(data.applications || [])
      setCounts(data.counts || { pending: 0, approved: 0, rejected: 0 })
    } catch (loadError) {
      if (loadError.name !== 'AbortError') {
        setError(loadError.message || 'Unable to load applications.')
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [role, status, query, token])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      loadApplications(controller.signal)
    }, 180)
    return () => {
      window.clearTimeout(timeout)
      controller.abort()
    }
  }, [loadApplications])

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
  }, [preview])

  async function reviewApplication(application, decision) {
    if (decision === 'rejected' && !rejectionReason.trim()) {
      setError('Enter a rejection reason before submitting the decision.')
      return
    }
    setWorkingId(application.id)
    setError('')
    setNotice('')
    try {
      const response = await fetch(
        `${API_URL}/applications/${application.id}/decision`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision,
            rejection_reason: decision === 'rejected' ? rejectionReason.trim() : '',
          }),
        },
      )
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to save this review.')
      }
      setNotice(`${application.name}'s application was ${decision}.`)
      setRejectingId(null)
      setRejectionReason('')
      await loadApplications()
    } catch (reviewError) {
      setError(reviewError.message || 'Unable to save this review.')
    } finally {
      setWorkingId(null)
    }
  }

  async function viewDocument(document, applicant) {
    setPreviewLoading(true)
    setError('')
    try {
      const response = await fetch(`http://127.0.0.1:5000${document.url}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Unable to open this document.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      setPreview({ url, type: blob.type, label: `${applicant.name} · ${document.label}` })
    } catch (previewError) {
      setError(previewError.message || 'Unable to open this document.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const statCards = [
    { key: 'pending', label: 'Awaiting review', icon: Clock3 },
    { key: 'approved', label: 'Approved', icon: CheckCircle2 },
    { key: 'rejected', label: 'Rejected', icon: XCircle },
  ]

  return (
    <div className="resq-theme admin-theme min-h-screen">
      <header className="admin-topbar">
        <div className="resq-shell mx-auto flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="admin-brand-icon"><HeartHandshake size={23} /></span>
            <div>
              <h1 className="admin-brand">ResQ<span>link</span></h1>
              <p className="admin-brand-caption">TRUST & VERIFICATION DESK</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="admin-notification-wrap">
              <button
                type="button"
                className="admin-icon-button"
                aria-label={`Notifications: ${counts.pending} pending applications`}
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                <Bell size={19} />
                {counts.pending > 0 && <span className="admin-bell-dot" />}
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    className="admin-notification-popover"
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  >
                    <p className="admin-kicker">REVIEW QUEUE</p>
                    <strong>{counts.pending} application{counts.pending === 1 ? '' : 's'} awaiting review</strong>
                    <span>New organisation accounts remain limited until approved.</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <span className="admin-user-label"><ShieldCheck size={15} /> {user?.name || 'Administrator'}</span>
            <button type="button" onClick={onLogout} className="admin-logout">
              <LogOut size={16} /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="resq-shell mx-auto px-4 pb-14 pt-7 sm:px-6 lg:px-8">
        <motion.section
          className="admin-hero"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="admin-hero-orb" aria-hidden="true" />
          <div className="admin-hero-copy">
            <p className="admin-kicker"><ShieldCheck size={15} /> SECURE ADMIN WORKSPACE</p>
            <h2>Verification<br /><span>with care.</span></h2>
            <p>Review the people and organisations ready to support your community.</p>
            <blockquote>“Trust is built one thoughtful decision at a time.”</blockquote>
          </div>
          <div className="admin-hero-art" aria-hidden="true">
            <div className="admin-orbit admin-orbit-one" />
            <div className="admin-orbit admin-orbit-two" />
            <span className="admin-shield"><ShieldCheck size={72} /></span>
            <span className="admin-orbit-dot dot-one" />
            <span className="admin-orbit-dot dot-two" />
            <span className="admin-orbit-dot dot-three" />
          </div>
        </motion.section>

        <section className="admin-stats" aria-label="Application totals">
          {statCards.map(({ key, label, icon: Icon }, index) => (
            <motion.button
              key={key}
              type="button"
              className={`admin-stat-card admin-stat-${key}`}
              onClick={() => setStatus(key)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              aria-pressed={status === key}
            >
              <span className="admin-stat-icon"><Icon size={20} /></span>
              <span className="admin-stat-number">{counts[key] || 0}</span>
              <span className="admin-stat-label">{label}</span>
              <span className="admin-stat-glow" />
            </motion.button>
          ))}
        </section>

        <section className="admin-applications">
          <div className="admin-section-heading">
            <div>
              <p className="admin-kicker">APPLICANT DIRECTORY</p>
              <h2>Applications <span>{applications.length}</span></h2>
              <p>Volunteer, NGO / Ashram, and Blood Bank accounts.</p>
            </div>
            <button
              type="button"
              className="admin-refresh"
              onClick={() => loadApplications()}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="admin-filters">
            <label className="admin-search">
              <Search size={17} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, email, or profile"
                aria-label="Search applications"
              />
            </label>
            <label className="admin-select">
              <Users size={16} />
              <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by role">
                <option value="all">All applicant roles</option>
                <option value="volunteer">Volunteers</option>
                <option value="ngo">NGOs / Ashrams</option>
                <option value="blood_bank">Blood Banks</option>
              </select>
            </label>
            <label className="admin-select">
              <Filter size={16} />
              <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by verification status">
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </label>
          </div>

          {notice && <p className="admin-notice" role="status"><CheckCircle2 size={17} />{notice}</p>}
          {error && <p className="admin-error" role="alert"><AlertTriangle size={17} />{error}</p>}

          {loading ? (
            <div className="admin-empty"><RefreshCw size={22} className="animate-spin" />Loading applications…</div>
          ) : applications.length === 0 ? (
            <div className="admin-empty"><Building2 size={24} />No applications match these filters.</div>
          ) : (
            <div className="admin-application-list">
              {applications.map((application, index) => {
                const expanded = expandedId === application.id
                const rejecting = rejectingId === application.id
                return (
                  <motion.article
                    key={application.id}
                    className={`admin-application-card${expanded ? ' is-expanded' : ''}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.045, 0.3) }}
                    layout
                  >
                    <div className="admin-application-summary">
                      <div className="admin-applicant-avatar">{(application.name || '?').slice(0, 1).toUpperCase()}</div>
                      <div className="admin-applicant-main">
                        <h3>{application.name || 'Applicant'}</h3>
                        <p>{application.email}</p>
                        <div className="admin-applicant-meta">
                          <span><Building2 size={14} />{ROLE_LABELS[application.role] || application.role}</span>
                          <span><Clock3 size={14} />Registered {formatDate(application.registered_at)}</span>
                        </div>
                      </div>
                      <StatusBadge status={application.verification_status} />
                      <motion.button
                        type="button"
                        className="admin-detail-toggle"
                        onClick={() => setExpandedId(expanded ? null : application.id)}
                        whileTap={{ scale: 0.95 }}
                        aria-expanded={expanded}
                      >
                        <Eye size={16} /><span>{expanded ? 'Hide details' : 'Review'}</span>
                      </motion.button>
                    </div>

                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          className="admin-application-details"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <div className="admin-detail-grid">
                            <section>
                              <h4>Applicant profile</h4>
                              <dl>
                                {Object.entries(application.profile_details || {}).map(([key, value]) => (
                                  <div key={key}>
                                    <dt>{key.replaceAll('_', ' ')}</dt>
                                    <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                                  </div>
                                ))}
                              </dl>
                              {application.rejection_reason && (
                                <div className="admin-rejection-note">
                                  <strong>Previous rejection reason</strong>
                                  <p>{application.rejection_reason}</p>
                                  {application.reviewed_at && <small>Reviewed {formatDate(application.reviewed_at)}</small>}
                                </div>
                              )}
                            </section>
                            <section>
                              <h4>Verification documents</h4>
                              <div className="admin-document-list">
                                {(application.documents || []).length ? application.documents.map((document) => (
                                  <button
                                    key={document.field}
                                    type="button"
                                    className="admin-document-button"
                                    onClick={() => viewDocument(document, application)}
                                    disabled={previewLoading}
                                  >
                                    <FileText size={17} />
                                    <span>{document.label}</span>
                                    <ArrowDownToLine size={15} />
                                  </button>
                                )) : <p className="admin-muted">No documents were submitted.</p>}
                              </div>
                            </section>
                          </div>

                          {application.verification_status === 'pending' && (
                            <div className="admin-review-actions">
                              {rejecting ? (
                                <div className="admin-reject-form">
                                  <label htmlFor={`reject-reason-${application.id}`}>Rejection reason <span>required</span></label>
                                  <textarea
                                    id={`reject-reason-${application.id}`}
                                    value={rejectionReason}
                                    onChange={(event) => setRejectionReason(event.target.value)}
                                    maxLength={1000}
                                    placeholder="Explain what needs to be corrected before resubmission."
                                  />
                                  <div className="admin-reject-controls">
                                    <span>{rejectionReason.length}/1000</span>
                                    <button type="button" className="admin-secondary-button" onClick={() => { setRejectingId(null); setRejectionReason('') }}>
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-reject-button"
                                      onClick={() => reviewApplication(application, 'rejected')}
                                      disabled={workingId === application.id || !rejectionReason.trim()}
                                    >
                                      {workingId === application.id ? 'Saving…' : 'Confirm rejection'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="admin-review-button-row">
                                  <span>Review decision</span>
                                  <div>
                                    <button
                                      type="button"
                                      className="admin-reject-button"
                                      onClick={() => { setRejectingId(application.id); setError('') }}
                                    >
                                      <X size={16} /> Reject
                                    </button>
                                    <button
                                      type="button"
                                      className="admin-approve-button"
                                      onClick={() => reviewApplication(application, 'approved')}
                                      disabled={workingId === application.id}
                                    >
                                      <Check size={16} />{workingId === application.id ? 'Saving…' : 'Approve'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.article>
                )
              })}
            </div>
          )}
          <p className="admin-privacy-note"><ShieldCheck size={15} /> Verification documents are served only to authenticated administrators and are not publicly accessible.</p>
        </section>
      </main>

      <AnimatePresence>
        {preview && (
          <motion.div
            className="admin-preview-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                URL.revokeObjectURL(preview.url)
                setPreview(null)
              }
            }}
          >
            <motion.section
              className="admin-preview-modal"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              role="dialog"
              aria-modal="true"
              aria-label={preview.label}
            >
              <header>
                <div><FileText size={18} /><strong>{preview.label}</strong></div>
                <button
                  type="button"
                  aria-label="Close document preview"
                  onClick={() => {
                    URL.revokeObjectURL(preview.url)
                    setPreview(null)
                  }}
                ><X size={19} /></button>
              </header>
              {preview.type === 'application/pdf' ? (
                <iframe title={preview.label} src={preview.url} />
              ) : preview.type.startsWith('image/') ? (
                <img src={preview.url} alt={preview.label} />
              ) : (
                <p className="admin-muted">This file type cannot be previewed in the browser.</p>
              )}
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
