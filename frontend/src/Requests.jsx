import { useCallback, useEffect, useState } from 'react'
import { motion } from 'motion/react'
import {
  RefreshCw,
  ClipboardList,
  AlertCircle,
  Check,
  CheckCircle2,
  X,
  MessageCircle,
  Send,
  Clock3,
  PackageCheck,
  Truck,
  MapPin,
} from 'lucide-react'
import { getRequests, respondToRequest, reviewRequest, updateDelivery } from './api'

const STATUS_LABELS = {
  pending: 'Waiting for provider',
  approved: 'Accepted by provider',
  rejected: 'Declined',
  clarification_requested: 'Clarification needed',
  volunteer_assigned: 'Volunteer assigned',
  picked_up: 'Picked up',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
}

const TIMELINE_LABELS = {
  requested: 'Request sent',
  pending: 'Request sent',
  accepted: 'Accepted by provider',
  approved: 'Accepted by provider',
  declined: 'Declined by provider',
  rejected: 'Declined by provider',
  clarification_requested: 'Provider asked for details',
  clarification_received: 'Your details were sent',
  volunteer_assigned: 'Volunteer accepted delivery',
  picked_up: 'Package picked up',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivery completed',
}

const DELIVERY_STEPS = [
  { id: 'requested', label: 'Request submitted' },
  { id: 'accepted', label: 'Accepted by provider' },
  { id: 'volunteer_assigned', label: 'Volunteer accepted delivery' },
  { id: 'picked_up', label: 'Item picked up' },
  { id: 'out_for_delivery', label: 'Out for delivery' },
  { id: 'delivered', label: 'Delivery completed' },
]

const DELIVERY_STEP_EVENTS = {
  requested: ['requested', 'pending'],
  accepted: ['accepted', 'approved', 'rejected', 'declined'],
  volunteer_assigned: ['volunteer_assigned'],
  picked_up: ['picked_up'],
  out_for_delivery: ['out_for_delivery'],
  delivered: ['delivered'],
}

function DeliveryTimeline({ request, user }) {
  const status = String(request.status || 'pending').toLowerCase()
  const history = Array.isArray(request.status_history) ? request.status_history : []
  const currentStepByStatus = {
    pending: 'accepted',
    clarification_requested: 'accepted',
    approved: 'volunteer_assigned',
    volunteer_assigned: 'picked_up',
    picked_up: 'out_for_delivery',
    out_for_delivery: 'delivered',
    delivered: null,
    rejected: null,
  }
  const currentStep = Object.hasOwn(currentStepByStatus, status)
    ? currentStepByStatus[status]
    : 'accepted'
  const terminalFailure = status === 'rejected'
  const completedThrough = {
    pending: 0,
    clarification_requested: 0,
    rejected: 0,
    approved: 1,
    volunteer_assigned: 2,
    picked_up: 3,
    out_for_delivery: 4,
    delivered: 5,
  }[status] ?? 0

  return (
    <div className="mt-5 border-t border-violet-300/15 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-white">Delivery tracking</h4>
        <span className="text-xs text-slate-400">Volunteer-confirmed status updates · not live GPS</span>
      </div>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Delivery progress for request ${request.id}`}>
        {DELIVERY_STEPS.map((step, index) => {
          const event = [...history].reverse().find((entry) =>
            DELIVERY_STEP_EVENTS[step.id].includes(String(entry?.status || '').toLowerCase()))
          const isCurrent = step.id === currentStep
          const isComplete = index <= completedThrough
          const isStopped = terminalFailure && index > 1
          const isDeclined = terminalFailure && step.id === 'accepted'
          const label = step.id === 'accepted'
            ? status === 'rejected'
              ? 'Declined by provider'
              : ['pending', 'clarification_requested'].includes(status)
                ? 'Provider decision'
                : step.label
            : step.id === 'volunteer_assigned' && request.volunteer_name
              ? `Accepted by ${request.volunteer_name}`
              : step.label
          const detail = isStopped
            ? 'Not proceeding because the request was declined.'
            : step.id === 'accepted' && status === 'pending'
              ? 'Waiting for the provider to accept or decline.'
              : step.id === 'accepted' && status === 'clarification_requested'
                ? request.requester_id === user?.id
                  ? 'The provider needs more information from you.'
                  : 'Waiting for the requester to provide more information.'
                : step.id === 'volunteer_assigned' && status === 'approved'
                  ? 'Waiting for an approved volunteer to accept the delivery.'
                  : step.id === 'picked_up' && status === 'volunteer_assigned'
                    ? 'A volunteer accepted. Waiting for pickup to be confirmed.'
                    : step.id === 'out_for_delivery' && status === 'picked_up'
                      ? 'Pickup confirmed. Waiting for the volunteer to start delivery.'
                      : step.id === 'delivered' && status === 'out_for_delivery'
                        ? 'The volunteer marked the package as out for delivery.'
                        : event?.note
                          || (isCurrent ? 'This is the current step.' : '')
          const Icon = terminalFailure && step.id === 'accepted'
            ? X
            : isComplete ? CheckCircle2 : isCurrent ? Clock3 : PackageCheck
          const tone = isStopped
            ? 'text-slate-500 bg-slate-500/10'
            : isDeclined
              ? 'text-rose-200 bg-rose-400/15'
              : isComplete
                ? 'text-emerald-200 bg-emerald-400/15'
                : isCurrent
                  ? 'text-amber-200 bg-amber-400/15'
                  : 'text-slate-400 bg-slate-400/10'

          return (
            <li
              key={step.id}
              className={`delivery-event-enter flex min-w-0 items-start gap-3 rounded-xl border p-3 ${
                isDeclined
                  ? 'border-rose-300/30 bg-rose-400/5'
                  : isCurrent
                    ? 'border-amber-300/30 bg-amber-400/5'
                  : isComplete
                    ? 'border-emerald-300/15 bg-emerald-400/[0.03]'
                    : 'border-slate-400/10 bg-slate-900/30'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
              style={{ animationDelay: `${Math.min(index * 55, 275)}ms` }}
            >
              <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${isCurrent ? 'text-amber-100' : isDeclined ? 'text-rose-100' : isStopped ? 'text-slate-500' : 'text-white'}`}>
                  {label}
                  {isCurrent && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-amber-200">Current</span>}
                </span>
                {detail && <span className="mt-1 block text-xs leading-5 text-slate-400">{detail}</span>}
                {(event?.at || (step.id === 'volunteer_assigned' && request.volunteer_assigned_at)) && (
                  <time className="mt-1 block text-xs text-slate-500" dateTime={event?.at || request.volunteer_assigned_at}>
                    {new Date(event?.at || request.volunteer_assigned_at).toLocaleString()}
                  </time>
                )}
              </span>
            </li>
          )
        })}
      </ol>
      {status === 'rejected' && request.review_note && (
        <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-950/30 p-3 text-sm text-rose-100">
          Provider note: {request.review_note}
        </p>
      )}
    </div>
  )
}

function RequestTimeline({ request, user }) {
  if (request.fulfillment_method === 'delivery') {
    return <DeliveryTimeline request={request} user={user} />
  }

  const events = Array.isArray(request.status_history)
    ? request.status_history
      .filter((event) => TIMELINE_LABELS[String(event.status || '').toLowerCase()])
      .map((event) => ({ ...event, status: String(event.status).toLowerCase() }))
    : []
  if (!events.some((event) => ['requested', 'pending'].includes(event.status))) {
    events.unshift({ status: 'requested', at: request.created_at })
  }

  const status = String(request.status || 'pending').toLowerCase()
  if (
    ['approved', 'rejected'].includes(status) &&
    !events.some((event) => event.status === status)
  ) {
    events.push({ status, at: request.reviewed_at })
  }

  return (
    <ol className="mt-5 grid gap-3 border-t border-violet-300/15 pt-5 sm:grid-cols-2 xl:grid-cols-4" aria-label={`Status timeline for request ${request.id}`}>
      {events.map((event, index) => {
        const accepted = ['approved', 'accepted'].includes(event.status)
        const progressing = ['volunteer_assigned', 'picked_up', 'out_for_delivery', 'delivered'].includes(event.status)
        const declined = ['rejected', 'declined'].includes(event.status)
        const sent = ['requested', 'pending'].includes(event.status)
        const Icon = accepted || progressing || declined ? CheckCircle2 : sent ? PackageCheck : MessageCircle
        const provider = request.provider_role === 'normal_user' ? 'donor' : 'provider'
        const label = accepted
          ? `Accepted by ${provider}`
          : declined
            ? `Declined by ${provider}`
            : TIMELINE_LABELS[event.status]
        return (
          <li key={`${event.status}-${event.at || index}-${index}`} className="delivery-event-enter flex min-w-0 items-start gap-3" style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}>
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              accepted || progressing ? 'bg-emerald-400/15 text-emerald-200' : declined ? 'bg-rose-400/15 text-rose-200' : 'bg-violet-400/15 text-violet-200'
            }`}>
              <Icon size={16} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-white">{label}</span>
              {event.at && <time className="mt-1 block text-xs text-slate-400" dateTime={event.at}>{new Date(event.at).toLocaleString()}</time>}
              {event.note && <span className="mt-1 block text-xs text-slate-300">{event.note}</span>}
            </span>
          </li>
        )
      })}
      {['pending', 'clarification_requested'].includes(status) && (
        <li className="flex min-w-0 items-start gap-3" aria-current="step">
          <span className="relative mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-amber-200">
            <Clock3 size={16} />
            <span className="absolute inset-0 animate-ping rounded-full border border-amber-300/30 motion-reduce:animate-none" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-amber-100">
              {status === 'pending'
                ? 'Waiting for provider'
                : request.requester_id === user?.id ? 'Waiting for your reply' : 'Waiting for requester details'}
            </span>
            <span className="mt-1 block text-xs text-slate-400">
              {status === 'pending' ? 'The provider’s decision will appear here.' : 'The request returns for review after a reply.'}
            </span>
          </span>
        </li>
      )}
    </ol>
  )
}

export default function Requests({ user, mode = 'incoming' }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [workingId, setWorkingId] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [drafts, setDrafts] = useState({})
  const [activeForm, setActiveForm] = useState(null)

  const fetchRequests = useCallback(async () => {
    const data = await getRequests(mode === 'deliveries' ? 'deliveries' : '')
    return Array.isArray(data.requests) ? data.requests : []
  }, [mode])

  const refreshRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRequests(await fetchRequests())
    } catch (err) {
      setError(err.message || 'Unable to load your resource requests.')
    } finally {
      setLoading(false)
    }
  }, [fetchRequests])

  useEffect(() => {
    let cancelled = false
    const load = () => fetchRequests()
      .then((items) => {
        if (!cancelled) setRequests(items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load requests.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    load()
    const intervalId = window.setInterval(load, 15000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [fetchRequests])

  async function performReview(request, action) {
    const note = drafts[request.id]?.trim() || ''
    if (action !== 'approved' && !note) {
      setError('Add a short note before declining or requesting clarification.')
      return
    }

    setWorkingId(request.id)
    setError('')
    setNotice('')
    try {
      const result = await reviewRequest(request.id, action, note)
      setNotice(result.message || 'Request updated.')
      setActiveForm(null)
      setDrafts((current) => ({ ...current, [request.id]: '' }))
      await refreshRequests()
    } catch (err) {
      setError(err.message || 'The request could not be updated.')
    } finally {
      setWorkingId(null)
    }
  }

  async function sendClarification(request) {
    const responseText = drafts[request.id]?.trim() || ''
    if (!responseText) {
      setError('Add the requested clarification before submitting.')
      return
    }

    setWorkingId(request.id)
    setError('')
    setNotice('')
    try {
      const result = await respondToRequest(request.id, responseText)
      setNotice(result.message || 'Clarification sent.')
      setActiveForm(null)
      setDrafts((current) => ({ ...current, [request.id]: '' }))
      await refreshRequests()
    } catch (err) {
      setError(err.message || 'Your response could not be sent.')
    } finally {
      setWorkingId(null)
    }
  }

  async function updateDeliveryStatus(request, action) {
    setWorkingId(request.id)
    setError('')
    setNotice('')
    try {
      const result = await updateDelivery(request.id, action)
      setNotice(result.message || 'Delivery status updated.')
      await refreshRequests()
    } catch (err) {
      setError(err.message || 'Could not update this delivery.')
    } finally {
      setWorkingId(null)
    }
  }

  const role = user?.role || 'normal_user'
  const canReview = ['normal_user', 'volunteer', 'ngo', 'blood_bank'].includes(role)
  const displayedRequests = requests.filter((item) => mode === 'mine'
    ? item.requester_id === user?.id
    : mode === 'deliveries'
      ? true
      : item.provider_id === user?.id)
  const title = mode === 'mine'
    ? 'My requests and order updates'
    : mode === 'deliveries'
      ? 'Volunteer delivery tasks'
      : 'Requests for your listings'

  return (
    <section className="mx-auto w-full max-w-none px-1 py-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-violet-300">
            {mode === 'mine' ? 'MY REQUESTS' : mode === 'deliveries' ? 'DELIVERY DISPATCH' : 'INCOMING REQUESTS'}
          </p>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {mode === 'mine'
              ? 'Track each request from submission through the provider’s decision. Statuses refresh automatically.'
              : mode === 'deliveries'
                ? 'Accepted requests marked for delivery appear here. Claim an available task and update each real handoff step; the requester sees the same status timeline.'
                : 'Review requests sent for resources you published and respond to each requester.'}
          </p>
        </div>
        <motion.button
          type="button"
          onClick={refreshRequests}
          disabled={loading}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-violet-100 transition hover:border-violet-300/70 hover:bg-violet-950/60 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </motion.button>
      </div>

      {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-950/40 p-3 text-sm text-emerald-200">{notice}</p>}
      {error && (
        <div role="alert" className="mb-4 flex items-start gap-3 rounded-xl border border-rose-400/30 bg-rose-950/40 p-4 text-rose-200">
          <AlertCircle size={19} className="mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-violet-400/20 bg-slate-950/70 p-8 text-center text-slate-300">
          <RefreshCw size={22} className="mx-auto mb-3 animate-spin text-violet-300" />
          Loading your requests…
        </div>
      )}

      {!loading && !error && displayedRequests.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-dashed border-violet-400/30 bg-slate-950/60 px-6 py-12 text-center"
        >
          <ClipboardList size={36} className="mx-auto mb-3 text-violet-300" />
          <h3 className="text-lg font-semibold text-white">
            {mode === 'mine' ? 'You have not requested a resource yet' : mode === 'deliveries' ? 'No delivery tasks are ready' : 'No requests for your listings yet'}
          </h3>
          <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">
            {mode === 'mine'
              ? 'When you request an item in Resources, it will appear here with its status and provider updates.'
              : mode === 'deliveries'
                ? 'A delivery task appears after a donor accepts a request that needs volunteer delivery. This list refreshes automatically.'
                : 'When someone requests a resource you shared, their request will appear here for review.'}
          </p>
        </motion.div>
      )}

      {!loading && displayedRequests.length > 0 && (
        <div className="grid gap-4">
          {displayedRequests.map((item, index) => {
            const status = String(item.status || 'pending').toLowerCase()
            const ownsResource = item.provider_id === user?.id
            const canAct = mode === 'incoming' && canReview && ownsResource && status === 'pending'
            const isRequester = item.requester_id === user?.id
            const needsResponse = mode === 'mine' && isRequester && status === 'clarification_requested'
            const formOpen = activeForm?.id === item.id
            const deliveryAction = mode === 'deliveries'
              ? ({
                  approved: 'claim',
                  volunteer_assigned: item.volunteer_id === user?.id ? 'picked_up' : null,
                  picked_up: item.volunteer_id === user?.id ? 'out_for_delivery' : null,
                  out_for_delivery: item.volunteer_id === user?.id ? 'delivered' : null,
                }[status] || null)
              : null
            const deliveryActionLabel = {
              claim: 'Accept delivery',
              picked_up: 'Mark picked up',
              out_for_delivery: 'Mark out for delivery',
              delivered: 'Confirm delivered',
            }

            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 14, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: Math.min(index * 0.05, 0.25) }}
                whileHover={{ y: -2 }}
                className="overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-slate-950 via-slate-950 to-violet-950/50 shadow-xl shadow-black/20"
              >
                <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PackageCheck size={18} className="text-violet-300" />
                      <h3 className="text-lg font-bold text-white">{item.resource_title || 'Resource request'}</h3>
                      <span className="rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-100">
                        {STATUS_LABELS[status] || status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">
                      Request #{item.id} · {isRequester ? 'Requested by you' : `Requested by ${item.requester_name || 'community member'}`}
                      {item.created_at && ` · ${new Date(item.created_at).toLocaleString()}`}
                    </p>
                    {item.fulfillment_method && (
                      <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-100">
                        {item.fulfillment_method === 'delivery' ? <Truck size={14} /> : <MapPin size={14} />}
                        {item.fulfillment_method === 'delivery' ? 'Volunteer delivery requested' : 'Requester will pick up'}
                      </p>
                    )}
                    {mode === 'mine' && item.provider_name && (
                      <p className="mt-1 text-sm text-violet-200">Sent to {item.provider_name}</p>
                    )}
                    {item.volunteer_name && (
                      <p className="mt-2 text-sm text-emerald-200">
                        Delivery volunteer: {item.volunteer_name}
                      </p>
                    )}
                    {item.resource_location && (
                      <p className="mt-2 text-sm text-slate-300">
                        Pickup location: {item.resource_location}
                      </p>
                    )}
                    {item.delivery_address && (
                      <p className="mt-2 rounded-lg border border-violet-300/20 bg-violet-400/10 p-3 text-sm text-violet-100">
                        Delivery destination: {item.delivery_address}
                      </p>
                    )}
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">{item.message}</p>
                    {item.contact && <p className="mt-2 text-sm text-slate-300">Contact: {item.contact}</p>}
                    {item.review_note && (
                      <div className="mt-4 rounded-xl border border-amber-300/20 bg-amber-950/30 p-3 text-sm text-amber-100">
                        <strong className="flex items-center gap-2"><MessageCircle size={15} />Provider note</strong>
                        <p className="mt-1">{item.review_note}</p>
                      </div>
                    )}
                    {item.requester_response && (
                      <p className="mt-3 rounded-xl bg-violet-400/10 p-3 text-sm text-violet-100">
                        <strong>Your clarification:</strong> {item.requester_response}
                      </p>
                    )}
                  </div>

                  {canAct && !formOpen && (
                    <div className="flex flex-wrap gap-2 lg:max-w-[330px]">
                      <button
                        type="button"
                        disabled={workingId === item.id}
                        onClick={() => performReview(item, 'approved')}
                        className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-3.5 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:opacity-60"
                      >
                        <Check size={16} />Accept request
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveForm({ id: item.id, action: 'rejected' })}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-300/30 px-3.5 py-2.5 text-sm font-bold text-rose-200 transition hover:bg-rose-950/60"
                      >
                        <X size={16} />Decline request
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveForm({ id: item.id, action: 'clarification_requested' })}
                        className="inline-flex items-center gap-2 rounded-xl border border-violet-300/30 px-3.5 py-2.5 text-sm font-bold text-violet-100 transition hover:bg-violet-950/60"
                      >
                        <MessageCircle size={16} />Ask a question
                      </button>
                    </div>
                  )}

                  {needsResponse && !formOpen && (
                    <button
                      type="button"
                      onClick={() => setActiveForm({ id: item.id, action: 'response' })}
                      className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400"
                    >
                      <MessageCircle size={16} />Respond to provider
                    </button>
                  )}

                  {mode === 'deliveries' && deliveryAction && !formOpen && (
                    <motion.button
                      type="button"
                      disabled={workingId === item.id}
                      onClick={() => updateDeliveryStatus(item, deliveryAction)}
                      whileHover={{ y: -2, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      className="inline-flex items-center gap-2 self-start rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-400 disabled:opacity-60"
                    >
                      <Truck size={16} />
                      {workingId === item.id ? 'Updating…' : deliveryActionLabel[deliveryAction]}
                    </motion.button>
                  )}
                </div>

                <div className="border-t border-violet-300/15 px-5 pb-5 sm:px-6 sm:pb-6">
                  <RequestTimeline request={item} user={user} />
                </div>

                {formOpen && (
                  <div className="border-t border-violet-400/20 bg-slate-900/80 p-5 sm:p-6">
                    <label htmlFor={`request-note-${item.id}`} className="mb-2 block text-sm font-semibold text-white">
                      {activeForm.action === 'response'
                        ? 'Your clarification'
                        : activeForm.action === 'rejected'
                          ? 'Reason for declining'
                          : 'Question for the requester'}
                    </label>
                    <textarea
                      id={`request-note-${item.id}`}
                      rows={3}
                      maxLength={1000}
                      value={drafts[item.id] || ''}
                      onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                      className="w-full rounded-xl border border-violet-300/20 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-500/30"
                      placeholder="Write a clear message…"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-slate-400">{(drafts[item.id] || '').length}/1000</span>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setActiveForm(null)} className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-slate-200">Cancel</button>
                        <button
                          type="button"
                          disabled={workingId === item.id || !(drafts[item.id] || '').trim()}
                          onClick={() => activeForm.action === 'response'
                            ? sendClarification(item)
                            : performReview(item, activeForm.action)}
                          className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Send size={15} />{workingId === item.id ? 'Saving…' : 'Send'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {mode === 'mine' && item.fulfillment_method === 'delivery' && ['approved', 'volunteer_assigned', 'picked_up', 'out_for_delivery', 'delivered'].includes(status) && (
                  <div className="delivery-status-banner border-t border-emerald-300/15 bg-emerald-950/20 px-5 py-3 text-xs text-emerald-200">
                    <Truck size={14} className="mr-2 inline" />
                    {status === 'approved'
                      ? 'Accepted by the donor. Waiting for an approved volunteer to claim delivery.'
                      : status === 'delivered'
                        ? 'Delivery marked complete by the volunteer.'
                        : `Delivery update: ${STATUS_LABELS[status] || status.replaceAll('_', ' ')}.`}
                  </div>
                )}
              </motion.article>
            )
          })}
        </div>
      )}
    </section>
  )
}
