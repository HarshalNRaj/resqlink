
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Check,
  ClipboardCheck,
  Clock3,
  Droplets,
  Heart,
  HeartHandshake,
  HelpingHand,
  LogOut,
  Mail,
  MapPin,
  Package,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Siren,
  Users,
  HandHeart,
  Upload,
  UserRound,
} from "lucide-react";

import DonationForm from "./DonationForm";
import NearbyExplorer from "./NearbyExplorer";
import Requests from "./Requests";
import ResQlinkAssistant from "./ResQlinkAssistant";
import { getAccessToken, VERIFICATION_DOCUMENTS } from "./verification";

const ROLE_CONFIG = {
  normal_user: {
    label: "Community Member",
    eyebrow: "YOUR COMMUNITY, YOUR SUPPORT",
    title: "Find the help you need.",
    description:
      "Explore shared resources, connect with people willing to help, and make your next step a little easier.",
    image:
      "https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?auto=format&fit=crop&w=1400&q=85",
    icon: Heart,
    color: "emerald",
    actions: [
      { label: "Explore resources", target: "resources", icon: Search },
      { label: "Find nearby help", target: "nearby", icon: MapPin },
      { label: "Request support", target: "requests", icon: HeartHandshake },
    ],
  },
  volunteer: {
    label: "Volunteer",
    eyebrow: "SMALL ACTIONS, BIG DIFFERENCE",
    title: "Your time can change a life.",
    description:
      "Discover ways to contribute, share useful resources, and become part of a community that shows up for others.",
    image:
      "https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1400&q=85",
    icon: HandHeart,
    color: "blue",
    actions: [
      { label: "Explore community needs", target: "resources", icon: Search },
      { label: "Find nearby organizations", target: "nearby", icon: MapPin },
      { label: "Contribute resources", target: "donate", icon: Package },
    ],
  },
  ngo: {
    label: "NGO / Ashram",
    eyebrow: "ORGANIZATION WORKSPACE",
    title: "Turn community needs into action.",
    description:
      "Coordinate essential resources, discover available donations, and keep your organization's information up to date.",
    image:
      "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&w=1400&q=85",
    icon: Building2,
    color: "violet",
    actions: [
      { label: "Browse resources", target: "resources", icon: Package },
      { label: "Find nearby organizations", target: "nearby", icon: MapPin },
      { label: "View community requests", target: "requests", icon: Users },
    ],
  },
  blood_bank: {
    label: "Blood Bank",
    eyebrow: "BLOOD DONATION COMMUNITY",
    title: "Help make every connection count.",
    description:
      "Keep your facility information organized and make it easier for your community to learn about your services.",
    image:
      "https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1400&q=85",
    icon: Droplets,
    color: "rose",
    actions: [
      { label: "View facility details", target: "profile", icon: Building2 },
      { label: "Nearby organizations", target: "nearby", icon: MapPin },
      { label: "Community resources", target: "resources", icon: Heart },
    ],
  },
};

const ROLE_ALIASES = {
  user: "normal_user",
  donor: "volunteer",
  recipient: "normal_user",
  organization: "ngo",
  "blood bank": "blood_bank",
};

const DASHBOARD_VIEWS = ["overview", "resources", "nearby", "donate", "requests", "my-requests", "deliveries", "profile", "readiness"];

const FAQ_ITEMS = [
  {
    question: "How do I request a resource?",
    answer: "Open Resources, choose an available listing, and submit the request form. Select pickup or volunteer delivery. Your request and each provider or delivery update appear in My Requests.",
  },
  {
    question: "How does volunteer delivery tracking work?",
    answer: "Choose volunteer delivery when requesting an item. After the donor accepts, an approved volunteer can claim the task and mark it picked up, out for delivery, and delivered. These are status updates, not live GPS tracking.",
  },
  {
    question: "Why is my organisation account pending?",
    answer: "Volunteer, NGO / Ashram, and Blood Bank accounts need an administrator to review their submitted documents. Resource publishing becomes available after approval.",
  },
  {
    question: "Can I receive live emergency alerts here?",
    answer: "Not at this time. ResQlink's preparedness page is a personal planning checklist, not an emergency dispatch or live alert service. Follow official local authorities for urgent information.",
  },
  {
    question: "How do I update rejected verification documents?",
    answer: "Open Profile to see the review reason and upload a corrected set of documents for administrator review.",
  },
];

const DASHBOARD_THOUGHTS = [
  "Every useful connection begins with one person choosing to care.",
  "Preparedness turns concern into a thoughtful next step.",
  "A stronger community is built one shared resource at a time.",
];

function AnimatedThought() {
  const [thoughtIndex, setThoughtIndex] = useState(0);
  const [visibleText, setVisibleText] = useState("");
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) {
      return undefined;
    }
    let position = 0;
    let timeoutId;
    const thought = DASHBOARD_THOUGHTS[thoughtIndex];

    function typeNextCharacter() {
      position += 1;
      setVisibleText(thought.slice(0, position));
      if (position < thought.length) {
        timeoutId = window.setTimeout(typeNextCharacter, 36);
      } else {
        timeoutId = window.setTimeout(() => {
          setThoughtIndex((current) => (current + 1) % DASHBOARD_THOUGHTS.length);
        }, 2800);
      }
    }

    timeoutId = window.setTimeout(() => {
      setVisibleText("");
      timeoutId = window.setTimeout(typeNextCharacter, 36);
    }, 220);
    return () => window.clearTimeout(timeoutId);
  }, [thoughtIndex, reduceMotion]);

  return (
    <div className="animated-thought" aria-label={DASHBOARD_THOUGHTS[thoughtIndex]}>
      <Sparkles size={20} aria-hidden="true" />
      <p aria-hidden="true">
        {reduceMotion ? DASHBOARD_THOUGHTS[thoughtIndex] : visibleText}
        {!reduceMotion && <span className="typewriter-caret" />}
      </p>
      <span className="sr-only">{DASHBOARD_THOUGHTS[thoughtIndex]}</span>
    </div>
  );
}

function CommunityWorkflow() {
  const steps = [
    { icon: Package, title: "Share", detail: "A member lists a resource." },
    { icon: Search, title: "Discover", detail: "The community browses available items." },
    { icon: HeartHandshake, title: "Request", detail: "A person submits a request for an item." },
  ];

  return (
    <section className="workflow-panel" aria-labelledby="workflow-title">
      <div className="workflow-heading">
        <p className="eyebrow">HOW RESQLINK WORKS TODAY</p>
        <h2 id="workflow-title">A simple path from sharing to support</h2>
        <p>Each step is a real part of the current community resource flow.</p>
      </div>
      <div className="workflow-track">
        {steps.map(({ icon: Icon, title, detail }, index) => (
          <motion.article
            className="workflow-step"
            key={title}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ delay: index * 0.12, type: "spring", stiffness: 150, damping: 18 }}
            whileHover={{ y: -6, rotateX: 3 }}
          >
            <span className="workflow-step-icon"><Icon size={22} /></span>
            <span className="workflow-step-number">0{index + 1}</span>
            <h3>{title}</h3>
            <p>{detail}</p>
          </motion.article>
        ))}
      </div>
      <p className="workflow-note">Requests are recorded for follow-up; automated matching, dispatch, and live tracking are not currently provided.</p>
    </section>
  );
}

function FAQAccordion() {
  const [activeQuestion, setActiveQuestion] = useState(null);

  return (
    <section id="faq" className="faq-section" aria-labelledby="faq-heading">
      <div className="faq-heading">
        <p className="eyebrow">GOOD TO KNOW</p>
        <h2 id="faq-heading">A few helpful answers</h2>
        <p>Hover or focus a question to reveal its answer, or tap to keep it open.</p>
      </div>
      <div className="faq-list">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = activeQuestion === index;
          return (
            <motion.article
              className={`faq-item${isOpen ? " is-open" : ""}`}
              key={item.question}
              onMouseEnter={() => setActiveQuestion(index)}
              onMouseLeave={() => setActiveQuestion((current) => current === index ? null : current)}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.07, duration: 0.35 }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                onFocus={() => setActiveQuestion(index)}
                onClick={() => setActiveQuestion((current) => current === index ? null : index)}
              >
                <span>{item.question}</span>
                <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
                  <Plus size={18} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className="faq-answer"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    <p>{item.answer}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-7">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}

function ActionCard({ icon: Icon, title, description, onClick, tint = "green" }) {
  const tints = {
    green: "bg-emerald-50 text-emerald-700 group-hover:bg-emerald-600",
    blue: "bg-blue-50 text-blue-700 group-hover:bg-blue-600",
    violet: "bg-violet-50 text-violet-700 group-hover:bg-violet-600",
    rose: "bg-rose-50 text-rose-700 group-hover:bg-rose-600",
    orange: "bg-orange-50 text-orange-700 group-hover:bg-orange-600",
  };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="group flex h-full w-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left transition duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-950/5 sm:p-6"
      whileHover={{ y: -5, rotateX: 2, scale: 1.012 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
    >
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition group-hover:text-white ${tints[tint] || tints.green}`}
      >
        <Icon size={23} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-slate-900">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-slate-500">
          {description}
        </span>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">
          Open section <ArrowRight size={15} />
        </span>
      </span>
    </motion.button>
  );
}

function VerificationNotice({ status, role, rejectionReason }) {
  if (role === "normal_user") return null;

  const pending = status === "pending";
  const rejected = status === "rejected";

  return (
    <div
      className={`mb-7 flex items-start gap-3 rounded-2xl border p-4 ${
        pending
          ? "border-amber-200 bg-amber-50"
          : rejected
            ? "border-rose-200 bg-rose-50"
            : "border-emerald-200 bg-emerald-50"
      }`}
    >
      {pending ? (
        <Clock3 className="mt-0.5 shrink-0 text-amber-700" size={21} />
      ) : rejected ? (
        <ShieldCheck className="mt-0.5 shrink-0 text-rose-700" size={21} />
      ) : (
        <BadgeCheck className="mt-0.5 shrink-0 text-emerald-700" size={21} />
      )}
      <div>
        <p className="font-bold text-slate-900">
          {pending
            ? "Your documents are awaiting verification"
            : rejected
              ? "Verification needs attention"
              : "Your organization profile"}
        </p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {pending
            ? "You can explore the community while your application is reviewed. Resource publishing unlocks after approval."
            : rejected
              ? rejectionReason || "Your application was not approved. Update your documents and resubmit for review."
              : "Your account is ready. Keep your profile and contact information up to date."}
        </p>
      </div>
    </div>
  );
}

const PREPAREDNESS_TASKS = {
  normal_user: [
    {
      id: "contacts",
      title: "Build a trusted contact card",
      detail: "Write down family contacts, one out-of-area contact, and the emergency numbers published by your local authorities.",
    },
    {
      id: "meeting-place",
      title: "Agree on a family meeting point",
      detail: "Choose one spot near home and a second outside your neighborhood, then make sure everyone knows both.",
    },
    {
      id: "essentials",
      title: "Prepare a small essentials kit",
      detail: "Gather drinking water, regular medicines, a torch, a charger, copies of key documents, and a little cash.",
    },
  ],
  volunteer: [
    {
      id: "safe-area",
      title: "Set your safe service area",
      detail: "Check official local advisories, set a travel boundary, and share your availability with your coordinator.",
    },
    {
      id: "safety-kit",
      title: "Check your volunteer safety kit",
      detail: "Keep water, a charged phone, weather-appropriate clothing, and task-appropriate protective equipment ready.",
    },
    {
      id: "coordinator",
      title: "Save your coordinator's details",
      detail: "Keep the verified organisation contact and check in before accepting or travelling to an assignment.",
    },
  ],
  ngo: [
    {
      id: "people",
      title: "Refresh your staff and beneficiary contacts",
      detail: "Agree who will send updates, keep an offline contact copy, and protect personal information.",
    },
    {
      id: "supplies",
      title: "Count essential supplies and safe capacity",
      detail: "Record current water, food, medicine, and shelter capacity so your team can share accurate information.",
    },
    {
      id: "coordination",
      title: "Confirm your official coordination channel",
      detail: "Know which local authority or trusted partner your organisation will contact for verified updates.",
    },
  ],
  blood_bank: [
    {
      id: "stock",
      title: "Review stock levels and expiry dates",
      detail: "Use your facility's established procedures to reconcile available stock and flag upcoming expiries.",
    },
    {
      id: "cold-chain",
      title: "Check cold-chain and backup power readiness",
      detail: "Confirm monitoring, escalation contacts, and backup-power checks follow your facility's approved protocol.",
    },
    {
      id: "on-call",
      title: "Refresh the on-call contact tree",
      detail: "Make sure the current duty roster and escalation contacts are available to authorised staff.",
    },
  ],
};

const ROLE_NOTIFICATIONS = {
  normal_user: [
    { id: "resources", title: "Community resources are ready", detail: "Browse available items and contact the person offering them.", target: "resources", icon: Package },
    { id: "safety", title: "Take a moment to review your plan", detail: "Keep trusted contacts and essential documents close by.", target: "readiness", icon: ShieldCheck },
  ],
  volunteer: [
    { id: "requests", title: "Community needs are waiting", detail: "Review requests before accepting a task.", target: "requests", icon: Users },
    { id: "safety", title: "Check your response readiness", detail: "Only take assignments you can complete safely.", target: "readiness", icon: ShieldCheck },
  ],
  ngo: [
    { id: "requests", title: "Coordination desk", detail: "Review community requests and available resources.", target: "requests", icon: Building2 },
    { id: "safety", title: "Preparedness review", detail: "Confirm contacts, supplies and capacity with your team.", target: "readiness", icon: ClipboardCheck },
  ],
  blood_bank: [
    { id: "profile", title: "Facility readiness check", detail: "Review operational contacts and emergency stock procedures.", target: "readiness", icon: Droplets },
    { id: "profile-details", title: "Keep facility details current", detail: "Check your profile for up-to-date service information.", target: "profile", icon: Building2 },
  ],
};

function getSavedDashboardItems(key, allowedItems) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved)
      ? saved.filter((item) => allowedItems.includes(item))
      : [];
  } catch {
    return [];
  }
}

function CommunityReadiness({ role }) {
  const tasks = PREPAREDNESS_TASKS[role];
  const completedTasksKey = `resqlink_readiness_${role}`;
  const [completedTasks, setCompletedTasks] = useState(() =>
    getSavedDashboardItems(completedTasksKey, tasks.map((task) => task.id)),
  );

  function toggleTask(taskId) {
    const next = completedTasks.includes(taskId)
      ? completedTasks.filter((item) => item !== taskId)
      : [...completedTasks, taskId];
    localStorage.setItem(completedTasksKey, JSON.stringify(next));
    setCompletedTasks(next);
  }

  return (
    <motion.section
      className="readiness-grid readiness-page"
      aria-label="Emergency preparedness"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
    >
      <motion.div
        className="readiness-card"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.5 }}
      >
        <div className="readiness-heading">
          <span className="readiness-icon readiness-icon-alert"><Siren size={19} /></span>
          <div>
            <p className="eyebrow">BE READY TO RESPOND</p>
            <h2>{role === "blood_bank" ? "Facility readiness plan" : "Your preparedness plan"}</h2>
          </div>
          <span className="readiness-progress">
            {completedTasks.length}/{tasks.length}
          </span>
        </div>
        <p className="readiness-note">
          Practical steps to prepare before an emergency. This is a personal checklist, not a live alert service; always follow verified local guidance.
        </p>
        <div className="readiness-tasks readiness-task-grid">
          {tasks.map((task, index) => {
            const completed = completedTasks.includes(task.id);
            return (
              <motion.article
                key={task.id}
                className={`readiness-task-card${completed ? " is-complete" : ""}`}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
              >
                <div className="readiness-task-card-heading">
                  <span className="readiness-task-number">0{index + 1}</span>
                  <button
                    type="button"
                    className="readiness-task-toggle"
                    onClick={() => toggleTask(task.id)}
                    aria-pressed={completed}
                  >
                    <span className="readiness-checkbox">{completed && <Check size={13} />}</span>
                    {completed ? "Done" : "Mark done"}
                  </button>
                </div>
                <h3>{task.title}</h3>
                <p>{task.detail}</p>
              </motion.article>
            );
          })}
        </div>
        <div className="readiness-quote">
          <Sparkles size={18} />
          <p>“Preparation is a quiet act of care for the people who count on us.”</p>
        </div>
      </motion.div>
    </motion.section>
  );
}

function NotificationBell({ role, onNavigate }) {
  const notifications = ROLE_NOTIFICATIONS[role];
  const key = `resqlink_notifications_${role}`;
  const [dismissed, setDismissed] = useState(() =>
    getSavedDashboardItems(key, notifications.map((notification) => notification.id)),
  );
  const [open, setOpen] = useState(false);
  const visibleNotifications = notifications.filter(
    (notification) => !dismissed.includes(notification.id),
  );

  function dismiss(notificationId) {
    const next = [...dismissed, notificationId];
    localStorage.setItem(key, JSON.stringify(next));
    setDismissed(next);
  }

  return (
    <div className="dashboard-notifications">
      <button
        type="button"
        className="dashboard-bell-button"
        aria-label={`Notifications, ${visibleNotifications.length} unread`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell size={18} />
        {visibleNotifications.length > 0 && <span>{visibleNotifications.length}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="dashboard-notification-popover"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
          >
            <div className="dashboard-notification-heading">
              <div><p className="eyebrow">YOUR WORKSPACE</p><strong>Notifications</strong></div>
              <span>{visibleNotifications.length}</span>
            </div>
            {visibleNotifications.length ? visibleNotifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <article className="notification-item" key={notification.id}>
                  <span className="notification-item-icon"><Icon size={17} /></span>
                  <div className="notification-item-copy">
                    <h3>{notification.title}</h3>
                    <p>{notification.detail}</p>
                    <button type="button" onClick={() => { setOpen(false); onNavigate(notification.target) }}>
                      Open <ArrowRight size={13} />
                    </button>
                  </div>
                  <button
                    type="button"
                    className="notification-dismiss"
                    aria-label={`Dismiss ${notification.title}`}
                    onClick={() => dismiss(notification.id)}
                  >×</button>
                </article>
              );
            }) : <div className="notifications-empty"><CheckCircle2 size={20} />You’re all caught up.</div>}
            <p className="notification-disclaimer"><AlertTriangle size={13} /> Demo prompts · not live alerts</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerificationResubmission({ user, onUpdated }) {
  const documents = VERIFICATION_DOCUMENTS[user.role] || [];
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (user.verification_status !== 'rejected' || documents.length === 0) return null;

  async function submit(event) {
    event.preventDefault();
    const missing = documents.find((document) => !files[document.key]);
    if (missing) {
      setError(`Please upload ${missing.label.toLowerCase()}.`);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    const body = new FormData();
    documents.forEach((document) => body.append(document.key, files[document.key]));
    try {
      const response = await fetch('http://127.0.0.1:5000/api/auth/resubmit', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to resubmit your documents.');
      }
      setFiles({});
      setMessage(data.message);
      onUpdated(data.user);
    } catch (submitError) {
      setError(submitError.message || 'Unable to resubmit your documents.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.form
      className="verification-resubmit"
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div>
        <h3>Update your verification documents</h3>
        <p>Upload a corrected set of documents to return your application to the review queue.</p>
      </div>
      <div className="verification-resubmit-fields">
        {documents.map((document) => (
          <label key={document.key} className="verification-file-field">
            <Upload size={17} />
            <span>{document.label}</span>
            <small>{files[document.key]?.name || 'PDF, PNG or JPG · max 5 MB'}</small>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={(event) => setFiles((current) => ({
                ...current,
                [document.key]: event.target.files?.[0],
              }))}
            />
          </label>
        ))}
      </div>
      {error && <p className="admin-error" role="alert">{error}</p>}
      {message && <p className="admin-notice" role="status">{message}</p>}
      <button type="submit" className="admin-approve-button" disabled={loading}>
        {loading ? 'Submitting…' : 'Resubmit for verification'} <ArrowRight size={16} />
      </button>
    </motion.form>
  );
}

function ProfileEditor({ user, role, name, profile, onUserUpdated }) {
  const [form, setForm] = useState(() => ({
    name,
    phone: user?.phone || profile.phone || "",
    location: user?.location || profile.location || "",
    city: profile.city || "",
    postal_code: profile.postal_code || "",
    emergency_contact_name: profile.emergency_contact_name || "",
    emergency_contact_phone: profile.emergency_contact_phone || "",
    availability: profile.availability || "",
    skills: profile.skills || "",
    languages: profile.languages || "",
    bio: profile.bio || "",
  }));
  const [photoFile, setPhotoFile] = useState(null);
  const [localPhoto, setLocalPhoto] = useState("");
  const [savedPhoto, setSavedPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [directoryLocation, setDirectoryLocation] = useState(() => ({
    enabled: profile.directory_location_shared === true,
    latitude: profile.service_latitude || "",
    longitude: profile.service_longitude || "",
  }));
  const [capturingLocation, setCapturingLocation] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl;
    if (!user?.profile_photo_url || photoFile) {
      return () => {
        active = false;
      };
    }
    fetch(`http://127.0.0.1:5000${user.profile_photo_url}`, {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load your profile photo.");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setSavedPhoto(objectUrl);
      })
      .catch((photoError) => {
        if (active) setError(photoError.message);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user?.profile_photo_url, photoFile]);

  function handleChange(event) {
    const { name: field, value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Profile photos must be no larger than 3 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setPhotoFile(file);
    setSavedPhoto("");
    const reader = new FileReader();
    reader.onload = () => setLocalPhoto(String(reader.result || ""));
    reader.onerror = () => setError("Unable to preview this photo. Choose another image.");
    reader.readAsDataURL(file);
  }

  function captureDirectoryLocation() {
    if (!navigator.geolocation) {
      setError("Location is not available in this browser.");
      return;
    }
    setCapturingLocation(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDirectoryLocation({
          enabled: true,
          latitude: position.coords.latitude.toFixed(2),
          longitude: position.coords.longitude.toFixed(2),
        });
        setCapturingLocation(false);
      },
      (locationError) => {
        setError(locationError.code === locationError.PERMISSION_DENIED
          ? "Location permission was denied. You can enable it in your browser settings and try again."
          : "Unable to determine the organization location. Try again or contact your administrator.");
        setCapturingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const body = new FormData();
    body.append("name", form.name);
    body.append("phone", form.phone);
    body.append("location", form.location);
    body.append("profile_data", JSON.stringify({
      ...profile,
      city: form.city,
      postal_code: form.postal_code,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
      availability: form.availability,
      skills: form.skills,
      languages: form.languages,
      bio: form.bio,
      directory_location_shared: directoryLocation.enabled,
      service_latitude: directoryLocation.latitude,
      service_longitude: directoryLocation.longitude,
    }));
    if (photoFile) body.append("profile_photo", photoFile);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/auth/profile", {
        method: "PUT",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body,
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save your profile.");
      }
      setPhotoFile(null);
      setLocalPhoto("");
      setMessage(data.message);
      onUserUpdated(data.user);
    } catch (saveError) {
      setError(saveError.message || "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  }

  const inputClassName = "profile-input";
  const registrationDetails = [
    ["Contact person", profile.contact_person],
    ["Organization", profile.organisation_name],
    ["Organization type", profile.organisation_type],
    ["Facility", profile.facility_name],
    ["Service area", profile.service_area],
    ["Registration number", profile.registration_number],
    ["Preferred tasks", profile.preferred_tasks],
    ["Services", profile.services],
    ["Blood groups", profile.blood_groups],
    ["Operating hours", profile.operating_hours],
    ["Transport", profile.transport],
    ["Registration introduction", profile.introduction],
  ]
    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value))
    .map(([label, value]) => [label, Array.isArray(value) ? value.join(", ") : value]);
  const fields = [
    { name: "phone", label: "Phone number", icon: Phone, type: "tel", maxLength: 40 },
    { name: "location", label: "Street address / location", icon: MapPin, maxLength: 150 },
    { name: "city", label: "City", icon: MapPin, maxLength: 100 },
    { name: "postal_code", label: "Postal code", maxLength: 20 },
    { name: "emergency_contact_name", label: "Emergency contact name", icon: UserRound, maxLength: 100 },
    { name: "emergency_contact_phone", label: "Emergency contact phone", icon: Phone, type: "tel", maxLength: 40 },
    { name: "availability", label: "Availability", maxLength: 100, placeholder: "e.g. Weekends, 9 am–5 pm" },
    { name: "skills", label: "Skills or areas of interest", maxLength: 250, placeholder: "e.g. First aid, food distribution" },
    { name: "languages", label: "Languages", maxLength: 150, placeholder: "e.g. English, Kannada" },
  ];

  return (
    <motion.form
      className="profile-editor"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="profile-editor-heading">
        <div className="profile-avatar-wrap">
          <motion.div className="profile-avatar-ring" animate={{ rotate: 360 }} transition={{ duration: 24, repeat: Infinity, ease: "linear" }} />
          <div className="profile-avatar">
            {localPhoto || savedPhoto
              ? <img src={localPhoto || savedPhoto} alt={`${form.name || name}'s profile`} />
              : <UserRound size={34} />}
          </div>
          <label className="profile-photo-action" title="Upload a profile photo">
            <Camera size={16} />
            <span className="sr-only">Upload profile photo</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePhotoChange} />
          </label>
        </div>
        <div className="profile-editor-intro">
          <p className="eyebrow">MAKE IT YOURS</p>
          <h3>{form.name || name}</h3>
          <p><Mail size={15} />{user?.email || "Email not provided"}</p>
          <span>{role}</span>
        </div>
      </div>

      {registrationDetails.length > 0 && (
        <motion.section
          className="profile-registration-details"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          aria-label="Registration details"
        >
          <div>
            <p className="eyebrow">ON FILE</p>
            <h4>Registration details</h4>
          </div>
          <dl>
            {registrationDetails.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </motion.section>
      )}

      <div className="profile-form-section">
        <div className="profile-form-section-heading">
          <span>01</span>
          <div><h4>Personal details</h4><p>Keep your account and contact information up to date.</p></div>
        </div>
        <div className="profile-field-grid">
          <label className="profile-field">
            <span>Full name</span>
            <input className={inputClassName} name="name" value={form.name} onChange={handleChange} required maxLength={100} />
          </label>
          {fields.slice(0, 4).map(({ name: field, label, icon: Icon, ...attributes }) => (
            <label className="profile-field" key={field}>
              <span>{Icon && <Icon size={15} />}{label}</span>
              <input className={inputClassName} name={field} value={form[field]} onChange={handleChange} {...attributes} />
            </label>
          ))}
        </div>
      </div>

      <div className="profile-form-section">
        <div className="profile-form-section-heading">
          <span>02</span>
          <div><h4>Safety & community</h4><p>Share only the information you are comfortable providing.</p></div>
        </div>
        <div className="profile-field-grid">
          {fields.slice(4).map(({ name: field, label, icon: Icon, ...attributes }) => (
            <label className="profile-field" key={field}>
              <span>{Icon && <Icon size={15} />}{label}</span>
              <input className={inputClassName} name={field} value={form[field]} onChange={handleChange} {...attributes} />
            </label>
          ))}
          <label className="profile-field profile-field-wide">
            <span>A little about you</span>
            <textarea className={inputClassName} name="bio" value={form.bio} onChange={handleChange} rows={4} maxLength={500} placeholder="Tell the community about yourself or how you would like to contribute." />
          </label>
        </div>
      </div>

      {(user?.role === "ngo" || user?.role === "blood_bank") && (
        <div className="profile-form-section service-area-sharing">
          <div className="profile-form-section-heading">
            <span>03</span>
            <div><h4>Approximate service-area map location</h4><p>Optional. This publishes a coarse location pin, not your exact street address.</p></div>
          </div>
          <p className="service-area-privacy">If you choose to share, ResQlink rounds coordinates to about 1 km and shows the pin only for approved organizations in Explore Nearby. You can disable sharing here at any time.</p>
          <div className="service-area-controls">
            <button type="button" className="service-area-location-button" onClick={captureDirectoryLocation} disabled={capturingLocation}>
              <MapPin size={16} />{capturingLocation ? "Getting location…" : directoryLocation.latitude ? "Update approximate location" : "Use current location"}
            </button>
            {directoryLocation.latitude && directoryLocation.longitude && (
              <span className="service-area-captured">Approximate location set</span>
            )}
            <label className="service-area-toggle">
              <input
                type="checkbox"
                checked={directoryLocation.enabled}
                onChange={(event) => setDirectoryLocation((current) => ({ ...current, enabled: event.target.checked }))}
                disabled={directoryLocation.enabled && !directoryLocation.latitude}
              />
              <span>Show approximate service-area pin in directory</span>
            </label>
          </div>
        </div>
      )}

      {error && <p className="profile-form-message is-error" role="alert">{error}</p>}
      {message && <p className="profile-form-message" role="status"><CheckCircle2 size={17} />{message}</p>}
      <div className="profile-editor-actions">
        <p>Your profile details are saved securely to your ResQlink account.</p>
        <motion.button type="submit" disabled={saving} whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Save size={17} />{saving ? "Saving profile…" : "Save profile"}
        </motion.button>
      </div>
    </motion.form>
  );
}

export default function Dashboard({ user, onLogout, onUserUpdated }) {
  const viewLabels = {
    overview: "Overview",
    resources: "Resources",
    nearby: "Explore Nearby",
    donate: "Share a resource",
    requests: "Requests",
    "my-requests": "My Requests",
    deliveries: "Delivery tasks",
    profile: "Profile",
    readiness: "Preparedness",
  };
  const [activeView, setActiveView] = useState(() => {
    const initialView = window.location.hash.slice(1);
    return DASHBOARD_VIEWS.includes(initialView) ? initialView : "overview";
  });

  function navigateTo(target) {
    const nextView = target === "home" ? "overview" : target;
    if (!DASHBOARD_VIEWS.includes(nextView)) return;
    setActiveView(nextView);
    if (window.location.hash !== `#${nextView}`) {
      window.history.pushState({ view: nextView }, "", `#${nextView}`);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    function restoreViewFromHistory() {
      const nextView = window.location.hash.slice(1);
      setActiveView(DASHBOARD_VIEWS.includes(nextView) ? nextView : "overview");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    window.addEventListener("popstate", restoreViewFromHistory);
    return () => window.removeEventListener("popstate", restoreViewFromHistory);
  }, []);

  const normalizedRole = useMemo(() => {
    const rawRole = String(user?.role || "normal_user")
      .trim()
      .toLowerCase();

    const role = ROLE_ALIASES[rawRole] || rawRole;
    return ROLE_CONFIG[role] ? role : "normal_user";
  }, [user?.role]);

  const config = ROLE_CONFIG[normalizedRole];
  const RoleIcon = config.icon;

  const name =
    user?.name?.trim() ||
    user?.profile_data?.organisation_name ||
    user?.profile_data?.facility_name ||
    "Community Member";

  const profile = user?.profile_data || {};
  const verificationStatus = user?.verification_status || "not_required";
  const canPublishResources =
    normalizedRole === "normal_user" || verificationStatus === "approved";

  const actions = {
    normal_user: [
      {
        icon: Search,
        title: "Find available resources",
        description: "Explore food, clothing, books, and other community donations.",
        target: "resources",
        tint: "green",
      },
      {
        icon: HeartHandshake,
        title: "Request support",
        description: "See community requests and find the right way to ask for help.",
        target: "requests",
        tint: "blue",
      },
      {
        icon: Package,
        title: "Give something back",
        description: "Share useful items with someone who may need them.",
        target: "donate",
        tint: "orange",
      },
    ],
    volunteer: [
      {
        icon: HelpingHand,
        title: "Deliver a community request",
        description: "Claim accepted delivery tasks and keep requesters updated at each handoff.",
        target: "deliveries",
        tint: "violet",
      },
      {
        icon: HelpingHand,
        title: "Explore community needs",
        description: "Find opportunities to support people through shared resources.",
        target: "resources",
        tint: "blue",
      },
      {
        icon: Package,
        title: "Contribute a donation",
        description: "List useful items and make them available to your community.",
        target: "donate",
        tint: "green",
      },
      {
        icon: Users,
        title: "Connect through requests",
        description: "Browse the community request board to understand current needs.",
        target: "requests",
        tint: "violet",
      },
    ],
    ngo: [
      {
        icon: Package,
        title: "Resource coordination",
        description: "Browse shared resources that could support your organization's work.",
        target: "resources",
        tint: "violet",
      },
      {
        icon: HeartHandshake,
        title: "Community requests",
        description: "Review the request board and understand the needs being shared.",
        target: "requests",
        tint: "green",
      },
      {
        icon: Building2,
        title: "Organization profile",
        description: "Review your registered organization information.",
        target: "profile",
        tint: "blue",
      },
    ],
    blood_bank: [
      {
        icon: Droplets,
        title: "Blood group information",
        description: "Review the blood groups and service details in your facility profile.",
        target: "profile",
        tint: "rose",
      },
      {
        icon: Building2,
        title: "Facility profile",
        description: "Check your facility name, registration details, and contact person.",
        target: "profile",
        tint: "blue",
      },
      {
        icon: Heart,
        title: "Community resource board",
        description: "Explore the resources currently shared through ResQlink.",
        target: "resources",
        tint: "green",
      },
    ],
  };

  const roleActions = actions[normalizedRole].filter(
    (action) =>
      (canPublishResources || action.target !== "donate")
      && (action.target !== "deliveries" || verificationStatus === "approved"),
  );
  const pageTitle = activeView === "profile"
    ? normalizedRole === "ngo"
      ? "Organization details"
      : normalizedRole === "blood_bank"
        ? "Facility details"
        : normalizedRole === "volunteer"
          ? "Volunteer profile"
          : "Your profile"
    : activeView === "readiness"
      ? normalizedRole === "blood_bank"
        ? "Facility readiness plan"
        : "Your preparedness plan"
      : viewLabels[activeView];

  return (
    <MotionConfig reducedMotion="user">
    <div className="resq-theme min-h-screen bg-[#f6f9f7] text-slate-800">
      {/* Top navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="resq-shell mx-auto px-4 sm:px-6 lg:px-8">
          <div className="dashboard-header-row flex items-center justify-between gap-4 py-3">
          <button
            type="button"
            onClick={() => navigateTo("overview")}
            className="flex items-center gap-3"
          >
            <motion.span
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
              whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
              transition={{ duration: 0.45 }}
            >
              <HeartHandshake size={23} />
            </motion.span>
            <span className="text-left">
              <span className="block text-xl font-black tracking-tight text-slate-900">
                ResQ<span className="text-emerald-600">link</span>
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">
                Community support network
              </span>
            </span>
          </button>

          <nav className="dashboard-nav" aria-label="Dashboard pages">
            {["overview", "resources", "nearby", ...(canPublishResources && normalizedRole !== "blood_bank" ? ["donate"] : []), "requests", "my-requests", ...(normalizedRole === "volunteer" && verificationStatus === "approved" ? ["deliveries"] : []), "readiness", "profile"].map((view) => (
              <motion.button
                key={view}
                type="button"
                onClick={() => navigateTo(view)}
                aria-current={activeView === view ? "page" : undefined}
                className={`dashboard-nav-link${activeView === view ? " is-active" : ""}`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.94 }}
              >
                {view === "overview" ? "Home" : viewLabels[view]}
              </motion.button>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-800">
                {config.label}
              </span>
            </div>

            <NotificationBell role={normalizedRole} onNavigate={navigateTo} />

            <button
              type="button"
              onClick={() => navigateTo("profile")}
              title="View profile"
              aria-label="Open profile"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white font-bold text-emerald-800 transition hover:bg-emerald-50"
            >
              {(name[0] || "R").toUpperCase()}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
          </div>

        </div>
      </header>

      <main className="resq-shell mx-auto px-4 pb-12 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        {/* Welcome */}
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">
              {config.label} <span className="mx-1 text-slate-300">/</span>{" "}
              {pageTitle}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              {activeView === "overview"
                ? <>Welcome back, {name.split(" ")[0]}! <span aria-hidden="true">👋</span></>
                : pageTitle}
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
            <Activity size={15} className="text-emerald-600" />
            {activeView === "overview" ? "Your community hub" : (
              <button type="button" onClick={() => navigateTo("overview")} className="dashboard-back-link">
                <ArrowLeft size={14} /> Back to overview
              </button>
            )}
          </div>
        </div>

        <motion.div
          className="dashboard-view"
          key={activeView}
          initial={{ opacity: 0, y: 22, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
          transition={{ duration: 0.38, ease: "easeOut" }}
        >
        {activeView === "overview" && (
          <>
            <VerificationNotice
              status={verificationStatus}
              role={normalizedRole}
              rejectionReason={user?.rejection_reason}
            />

        {/* Role-specific hero */}
        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.65, type: "spring", stiffness: 90, damping: 18 }}
          className="resq-hero relative isolate min-h-[300px] overflow-hidden rounded-[28px] bg-slate-900 shadow-xl shadow-slate-900/10 sm:min-h-[330px]"
        >
          <img
            src={config.image}
            alt=""
            className="absolute inset-0 -z-20 h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/25" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/40 to-transparent" />

          <div className="flex min-h-[300px] flex-col justify-between gap-6 p-6 sm:min-h-[330px] sm:p-9 lg:p-10">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
              <Sparkles size={16} />
              {config.eyebrow}
            </div>

            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur">
                <RoleIcon size={15} />
                {config.label} dashboard
              </div>
              <h2 className="max-w-xl text-3xl font-black leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                {config.title}
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                {config.description}
              </p>
              <AnimatedThought />

              <div className="mt-7 flex flex-wrap gap-3">
                {config.actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={() => navigateTo(action.target)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400"
                    >
                      <Icon size={17} />
                      {action.label}
                      <ArrowRight size={16} />
                    </button>
                  );
                })}
              </div>
              <div className="overview-hero-network" aria-hidden="true">
                <motion.span animate={{ y: [0, -9, 0], rotate: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity }}><HeartHandshake size={23} /></motion.span>
                <motion.span animate={{ y: [0, 8, 0], rotate: [0, -8, 0] }} transition={{ duration: 4.7, repeat: Infinity, delay: 0.4 }}><Package size={20} /></motion.span>
                <motion.span animate={{ y: [0, -7, 0] }} transition={{ duration: 3.7, repeat: Infinity, delay: 0.8 }}><Users size={21} /></motion.span>
                <span className="overview-network-line" />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Role-specific quick actions */}
        <section className="mt-10">
          <SectionHeading
            eyebrow="YOUR NEXT STEP"
            title="How would you like to help today?"
            description="Jump straight to the tools and information relevant to your account."
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roleActions.map((action, index) => (
              <motion.div
                key={action.title}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <ActionCard
                  {...action}
                  onClick={() => navigateTo(action.target)}
                />
              </motion.div>
            ))}
          </div>
        </section>

            <CommunityWorkflow />
            <FAQAccordion />
          </>
        )}

        {activeView === "resources" && (
          <section className="dashboard-subpage">
            <SectionHeading
              eyebrow="COMMUNITY RESOURCE BOARD"
              title="Discover what's available nearby"
              description="Search real listings saved in the ResQlink database. Choose an item to send a request."
            />
            <DonationForm mode="browse" />
          </section>
        )}

        {activeView === "nearby" && (
          <section className="dashboard-subpage">
            <SectionHeading
              eyebrow="MAP & COMMUNITY DIRECTORY"
              title="Explore Nearby"
              description="Find verified NGOs, ashrams, and blood banks. Use the list without sharing your location, or choose a city/current location to filter and map organizations that shared an approximate service area."
            />
            <NearbyExplorer />
          </section>
        )}

        {/* Donation area */}
        {activeView === "donate" && normalizedRole !== "blood_bank" && canPublishResources && (
          <section className="dashboard-subpage">
            <DonationForm mode="donate" />
          </section>
        )}
        {activeView === "donate" && normalizedRole !== "blood_bank" && !canPublishResources && (
          <section className="verification-locked-note">
            <ShieldCheck size={20} />
            <p>Resource publishing is locked until an administrator approves your verification application.</p>
          </section>
        )}

        {/* Community requests */}
        {activeView === "requests" && <section className="dashboard-subpage">
          <SectionHeading
            eyebrow="PROVIDER INBOX"
            title={
              normalizedRole === "ngo"
                ? "Requests for your resources"
                : normalizedRole === "volunteer"
                  ? "Requests for resources you shared"
                  : normalizedRole === "blood_bank"
                    ? "Requests for your resources"
                    : "Requests for your listings"
            }
            description="Review requests sent for resources you published and respond to the requester."
          />

          <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Users size={22} />
              </span>
              <div>
                <h3 className="font-bold text-slate-900">
                  Incoming resource requests
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Requests for resources you own appear here. Requests you submitted are tracked separately under My Requests.
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 sm:p-4">
              <Requests user={user} mode="incoming" />
            </div>
          </div>
        </section>}

        {activeView === "my-requests" && <section className="dashboard-subpage">
          <SectionHeading
            eyebrow="REQUEST TRACKER"
            title="My Requests"
            description="Track each resource request from submission through the provider’s response."
          />
          <div className="rounded-3xl border border-violet-300/20 bg-slate-950/70 p-4 shadow-2xl shadow-black/20 sm:p-6">
            <Requests user={user} mode="mine" />
          </div>
        </section>}

        {activeView === "deliveries" && normalizedRole === "volunteer" && verificationStatus === "approved" && (
          <section className="dashboard-subpage">
            <SectionHeading
              eyebrow="VOLUNTEER DISPATCH"
              title="Delivery tasks"
              description="See donor-approved requests that need delivery. Claim a task to become its assigned volunteer, then record pickup, transit, and delivery updates."
            />
            <div className="rounded-3xl border border-violet-300/20 bg-slate-950/70 p-4 shadow-2xl shadow-black/20 sm:p-6">
              <Requests user={user} mode="deliveries" />
            </div>
          </section>
        )}

        {/* Role profile */}
        {activeView === "profile" && <section className="dashboard-subpage">
          <SectionHeading
            eyebrow="YOUR ACCOUNT"
            title={
              normalizedRole === "ngo"
                ? "Organization details"
                : normalizedRole === "blood_bank"
                  ? "Facility details"
                  : normalizedRole === "volunteer"
                    ? "Volunteer profile"
                    : "Your profile"
            }
            description="Your account information and registration details."
          />

          <div className="profile-layout">
            <ProfileEditor
              key={user?.id}
              user={user}
              role={config.label}
              name={name}
              profile={profile}
              onUserUpdated={onUserUpdated}
            />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                <ShieldCheck size={24} />
              </span>
              <h3 className="mt-5 text-lg font-extrabold text-slate-900">
                Account & verification
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your dashboard access and document review status are shown
                separately.
              </p>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Verification status
                </p>
                <p className="mt-2 font-bold capitalize text-slate-900">
                  {String(verificationStatus).replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {verificationStatus === "pending"
                    ? "You can browse community listings. Publishing resources is available after an administrator approves your documents."
                    : verificationStatus === "not_required"
                      ? "No document review is currently required for this account."
                      : verificationStatus === "rejected"
                        ? user?.rejection_reason || "Update your documents below and resubmit them for review."
                        : "Your account is verified. Keep your profile and contact details current."}
                </p>
              </div>
              {verificationStatus === "rejected" && (
                <VerificationResubmission user={user} onUpdated={onUserUpdated} />
              )}

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <MapPin className="mt-0.5 shrink-0 text-emerald-700" size={19} />
                <p className="text-sm leading-6 text-emerald-900">
                  ResQlink works best when your community and organization
                  details are accurate and up to date.
                </p>
              </div>
            </div>
          </div>
        </section>}

        {activeView === "readiness" && (
          <section className="dashboard-subpage">
            <SectionHeading
              eyebrow="BE READY TO RESPOND"
              title={normalizedRole === "blood_bank" ? "Facility readiness plan" : "A few steps you can take today"}
              description="Turn preparedness into practical, small actions. Tick each step when your household, team, or facility has it in place."
            />
            <CommunityReadiness role={normalizedRole} />
          </section>
        )}

        {/* Closing banner */}
        {activeView === "overview" && <section className="closing-banner mt-12 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-6 sm:p-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                <Heart size={24} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
                  TOGETHER, WE CAN DO MORE
                </p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  Every little contribution matters.
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                  Keep exploring, sharing, and connecting with your community.
                  Good things happen when people help one another.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigateTo("resources")}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 font-bold text-white transition hover:bg-emerald-700"
            >
              Explore resources <ArrowRight size={17} />
            </button>
          </div>
        </section>}

        </motion.div>

        {activeView === "overview" && (
          <footer className="resq-footer">
            <div className="resq-footer-marquee" aria-label="ResQlink: small acts of care make stronger communities">
              <div className="resq-footer-marquee-track" aria-hidden="true">
                <span>ResQlink <i>·</i> Small acts of care make stronger communities <b>✳</b>&nbsp;</span>
                <span>ResQlink <i>·</i> Small acts of care make stronger communities <b>✳</b>&nbsp;</span>
              </div>
            </div>

            <div className="resq-footer-grid">
              <div className="resq-footer-about">
                <button type="button" className="resq-footer-brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                  <span className="resq-footer-brand-icon"><HeartHandshake size={20} /></span>
                  <span>ResQ<span>link</span></span>
                </button>
                <p>Connecting people through kindness, one resource at a time.</p>
                <a className="resq-footer-contact" href="mailto:support@resqlink.org">
                  <Mail size={15} /> support@resqlink.org <ArrowRight size={14} />
                </a>
              </div>

              <div className="resq-footer-column">
                <h2>Community</h2>
                <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>About ResQlink</button>
                <button type="button" onClick={() => document.getElementById("workflow-title")?.scrollIntoView({ behavior: "smooth", block: "center" })}>How it works</button>
                <button type="button" onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth", block: "center" })}>FAQ</button>
              </div>

              <div className="resq-footer-column">
                <h2>Explore</h2>
                <button type="button" onClick={() => navigateTo("resources")}>Resources</button>
                {canPublishResources && normalizedRole !== "blood_bank" && (
                  <button type="button" onClick={() => navigateTo("donate")}>Share a resource</button>
                )}
                <button type="button" onClick={() => navigateTo("readiness")}>Preparedness</button>
              </div>

              <div className="resq-footer-column">
                <h2>Your space</h2>
                <button type="button" onClick={() => navigateTo("requests")}>Community requests</button>
                <button type="button" onClick={() => navigateTo("profile")}>Your profile</button>
                <button type="button" onClick={() => document.getElementById("faq")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Get help</button>
              </div>
            </div>

            <div className="resq-footer-bottom">
              <p className="resq-footer-legal">© {new Date().getFullYear()} ResQlink. Here for stronger communities.</p>
              <button type="button" className="resq-back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                Back to top <span aria-hidden="true">↑</span>
              </button>
            </div>
          </footer>
        )}
      </main>
      <ResQlinkAssistant
        onNavigate={navigateTo}
        canPublishResources={canPublishResources}
      />
    </div>
    </MotionConfig>
  );
}
