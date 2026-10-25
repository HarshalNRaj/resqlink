import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  HeartHandshake,
  Package,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

const SUGGESTIONS = [
  { label: "Find resources", message: "How can I find a resource?", icon: Package },
  { label: "Verification", message: "How does verification work?", icon: ShieldCheck },
  { label: "Emergency prep", message: "How can I prepare for an emergency?", icon: Siren },
];

function getLocalReply(message, canPublishResources) {
  const text = message.toLowerCase();

  if (/\b(hello|hi|hey|good morning|good evening)\b/.test(text)) {
    return {
      text: "Hi! I can guide you around ResQlink, help you find the right page, or share practical preparedness tips. What would you like to do?",
      action: null,
    };
  }

  if (/\b(emergency|disaster|urgent|danger|earthquake|flood|fire|cyclone)\b/.test(text)) {
    return {
      text: "If you are in immediate danger, contact your local emergency services and follow official local-authority instructions. ResQlink does not send live alerts or dispatch help. For non-urgent planning, the Preparedness page has a personal checklist.",
      action: { label: "Open preparedness", target: "readiness" },
    };
  }

  if (/\b(verify|verification|verified|approve|approval|pending|rejected|documents)\b/.test(text)) {
    return {
      text: canPublishResources
        ? "Your account can use the available community features. Verified organizations and volunteers can check their current status on Profile."
        : "Volunteer, NGO / Ashram, and Blood Bank accounts stay pending while an administrator reviews the submitted documents. You can see the status and any rejection reason on Profile.",
      action: { label: "Open profile", target: "profile" },
    };
  }

  if (/\b(donate|donation|share|publish|offer|list an item)\b/.test(text)) {
    return canPublishResources
      ? {
          text: "You can offer an item from Share a resource. Add its details and optionally attach a JPG, PNG, or WebP photo; the photo appears on its community listing.",
          action: { label: "Share a resource", target: "donate" },
        }
      : {
          text: "Resource publishing is available after an administrator approves your verification. You can browse community listings while your application is pending.",
          action: { label: "Check verification", target: "profile" },
        };
  }

  if (/\b(request|need help|ask for|ask help)\b/.test(text)) {
    return {
      text: "To request an item, open Resources, choose pickup or volunteer delivery, and submit the form. After the donor accepts a delivery request, an approved volunteer can claim it and post pickup, on-the-way, and delivered status updates. My Requests refreshes those updates; ResQlink does not share live GPS location.",
      action: { label: "Browse resources", target: "resources" },
    };
  }

  if (/\b(resource|food|clothes|books|essentials|browse|search|find)\b/.test(text)) {
    return {
      text: "Browse available community listings on Resources. You can search by name, location, or quantity and filter by category.",
      action: { label: "Browse resources", target: "resources" },
    };
  }

  if (/\b(profile|phone|contact|account|edit|photo|picture)\b/.test(text)) {
    return {
      text: "You can update your name, contact details, profile photo, emergency contact, skills, and other details from your Profile page.",
      action: { label: "Open profile", target: "profile" },
    };
  }

  if (/\b(prepare|preparedness|checklist|meeting point|emergency kit|supplies)\b/.test(text)) {
    return {
      text: "A useful start is to write down trusted contacts, agree on family meeting points, and prepare essential supplies and medicines. The Preparedness page has a checklist. Follow official local guidance during an emergency.",
      action: { label: "Open preparedness", target: "readiness" },
    };
  }

  if (/\b(about|how.*work|what.*resqlink|help)\b/.test(text)) {
    return {
      text: "ResQlink helps a community share resources, browse available items, and submit requests. It is not an emergency dispatch or live-alert service.",
      action: null,
    };
  }

  return {
    text: "I can help with finding resources, requesting an item, sharing a donation, verification, profile updates, or emergency preparedness. Try one of the suggested topics below.",
    action: null,
  };
}

export default function ResQlinkAssistant({ onNavigate, canPublishResources }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      from: "assistant",
      text: "Welcome to ResQlink. I can guide you to features and share practical preparedness information.",
      action: null,
    },
  ]);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const timeoutRef = useRef(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) {
      endRef.current?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages, typing, reducedMotion]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => () => window.clearTimeout(timeoutRef.current), []);

  function sendMessage(value = draft) {
    const text = value.trim();
    if (!text || typing) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, from: "user", text, action: null },
    ]);
    setDraft("");
    setTyping(true);

    timeoutRef.current = window.setTimeout(() => {
      const reply = getLocalReply(text, canPublishResources);
      setMessages((current) => [
        ...current,
        { id: `assistant-${Date.now()}`, from: "assistant", ...reply },
      ]);
      setTyping(false);
    }, reducedMotion ? 0 : 520);
  }

  return (
    <div className="resqlink-assistant">
      <AnimatePresence>
        {open && (
          <motion.section
            className="assistant-panel"
            role="dialog"
            aria-label="ResQlink assistant"
            aria-modal="false"
            initial={{ opacity: 0, y: 24, scale: 0.94, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, scale: 0.96, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
          >
            <header className="assistant-header">
              <div className="assistant-mark">
                <HeartHandshake size={20} />
                <span className="assistant-online-dot" />
              </div>
              <div className="assistant-header-copy">
                <strong>ResQlink Guide</strong>
                <span><Sparkles size={12} /> Private guided help</span>
              </div>
              <motion.button
                type="button"
                className="assistant-close"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                whileHover={{ rotate: 90, scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
              >
                <X size={18} />
              </motion.button>
            </header>

            <div className="assistant-disclaimer">
              Guided responses run in this browser. Not a live emergency service.
            </div>

            <div className="assistant-messages" aria-live="polite" aria-relevant="additions">
              {messages.map((message) => (
                <motion.article
                  className={`assistant-message is-${message.from}`}
                  key={message.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.24 }}
                >
                  <span className="assistant-message-icon" aria-hidden="true">
                    {message.from === "assistant" ? <HeartHandshake size={15} /> : <UserRound size={14} />}
                  </span>
                  <div className="assistant-message-content">
                    <p>{message.text}</p>
                    {message.action && (
                      <motion.button
                        type="button"
                        className="assistant-action"
                        onClick={() => {
                          setOpen(false);
                          onNavigate(message.action.target);
                        }}
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        {message.action.label}<ArrowRight size={14} />
                      </motion.button>
                    )}
                  </div>
                </motion.article>
              ))}

              {typing && (
                <div className="assistant-typing" role="status" aria-label="Assistant is responding">
                  <span /><span /><span />
                </div>
              )}
              <div ref={endRef} />
            </div>

            {messages.length === 1 && (
              <div className="assistant-suggestions" aria-label="Suggested questions">
                {SUGGESTIONS.map(({ label, message, icon: Icon }) => (
                  <motion.button
                    key={label}
                    type="button"
                    onClick={() => sendMessage(message)}
                    whileHover={{ y: -2, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={typing}
                  >
                    <Icon size={14} />{label}
                  </motion.button>
                ))}
              </div>
            )}

            <form
              className="assistant-compose"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage();
              }}
            >
              <label className="sr-only" htmlFor="resqlink-assistant-message">Message ResQlink Guide</label>
              <input
                ref={inputRef}
                id="resqlink-assistant-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ask how ResQlink works…"
                maxLength={500}
                autoComplete="off"
                disabled={typing}
              />
              <motion.button
                type="submit"
                aria-label="Send message"
                disabled={!draft.trim() || typing}
                whileHover={{ scale: 1.08, rotate: -5 }}
                whileTap={{ scale: 0.9 }}
              >
                <Send size={17} />
              </motion.button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        className={`assistant-launcher${open ? " is-open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close ResQlink assistant" : "Open ResQlink assistant"}
        aria-expanded={open}
        title="ResQlink assistant"
        whileHover={{ scale: 1.1, rotate: open ? 0 : -6 }}
        whileTap={{ scale: 0.91 }}
      >
        <motion.span
          className="assistant-launcher-orbit"
          aria-hidden="true"
          animate={reducedMotion ? undefined : { rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? "close" : "brand"}
            className="assistant-launcher-icon"
            initial={{ opacity: 0, scale: 0.65, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.65, rotate: 20 }}
            transition={{ duration: 0.16 }}
          >
            {open ? <X size={23} /> : <HeartHandshake size={25} />}
          </motion.span>
        </AnimatePresence>
        {!open && <span className="assistant-launcher-ping" aria-hidden="true" />}
      </motion.button>
    </div>
  );
}
