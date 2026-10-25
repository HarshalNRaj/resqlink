
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  HeartHandshake,
  HandHeart,
  Users,
  Building2,
  Droplet,
  ShieldCheck,
  Mail,
  LockKeyhole,
  UserRound,
  MapPin,
  Phone,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Upload,
  Clock,
  Car,
  BriefcaseBusiness,
} from 'lucide-react'
import { VERIFICATION_DOCUMENTS } from './verification'

const API_URL = 'http://127.0.0.1:5000/api/auth'

const roles = [
  {
    id: 'normal_user',
    title: 'Normal User',
    description: 'Donate and receive useful items',
    icon: HandHeart,
    color: 'emerald',
  },
  {
    id: 'volunteer',
    title: 'Volunteer',
    description: 'Help with pickups and delivery',
    icon: Users,
    color: 'violet',
  },
  {
    id: 'ngo',
    title: 'NGO / Ashram',
    description: 'Support community needs',
    icon: Building2,
    color: 'blue',
  },
  {
    id: 'blood_bank',
    title: 'Blood Bank',
    description: 'Connect people with blood services',
    icon: Droplet,
    color: 'rose',
  },
]

const initialProfile = {
  volunteer: {
    service_area: '',
    preferred_tasks: [],
    availability: '',
    transport: '',
    introduction: '',
  },
  ngo: {
    organisation_name: '',
    organisation_type: '',
    registration_number: '',
    contact_person: '',
    services: '',
  },
  blood_bank: {
    facility_name: '',
    registration_number: '',
    contact_person: '',
    blood_groups: [],
    operating_hours: '',
  },
}

const taskOptions = [
  'Pickup and delivery',
  'Food distribution',
  'Clothes and essentials',
  'Community support',
  'Emergency assistance',
]

const bloodGroups = [
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
]

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100'

const labelClass = 'mb-2 block text-sm font-semibold text-slate-700'

function Field({ label, icon: Icon, required = false, children }) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      <span className="relative block">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}
        {children}
      </span>
    </label>
  )
}

function TextInput({
  label,
  icon,
  required,
  className = '',
  ...props
}) {
  return (
    <Field label={label} icon={icon} required={required}>
      <input
        className={`${inputClass} ${icon ? 'pl-10' : ''} ${className}`}
        {...props}
      />
    </Field>
  )
}

function FileField({ label, file, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/60">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        {file ? <CheckCircle2 size={22} /> : <Upload size={22} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">
          {label}
        </span>
        <span className="mt-1 block break-all text-xs text-slate-500">
          {file ? file.name : 'PDF, PNG or JPG · Max 5 MB'}
        </span>
      </span>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
    </label>
  )
}

export default function Auth({ onClose, onLogin, initialMode = 'signin' }) {
  const [mode, setMode] = useState(
    initialMode === 'signup' ? 'signup' : 'signin',
  )
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [selectedRole, setSelectedRole] = useState('normal_user')
  const [profile, setProfile] = useState(() =>
    JSON.parse(JSON.stringify(initialProfile)),
  )
  const [documents, setDocuments] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isSignup = mode === 'signup'
  const isSimpleSignup = isSignup && selectedRole === 'normal_user'
  const selectedRoleInfo = roles.find((role) => role.id === selectedRole)
  const currentProfile = profile[selectedRole] || {}
  const requiredDocuments = VERIFICATION_DOCUMENTS[selectedRole] || []

  function changeMode(nextMode) {
    setMode(nextMode)
    setStep(1)
    setError('')
    setPassword('')
  }

  function updateProfile(field, value) {
    setProfile((previous) => ({
      ...previous,
      [selectedRole]: {
        ...previous[selectedRole],
        [field]: value,
      },
    }))
  }

  function toggleArrayValue(field, value) {
    const values = currentProfile[field] || []
    updateProfile(
      field,
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    )
  }

  function validateBasicDetails() {
    if (!name.trim() || !email.trim() || !password) {
      return 'Please complete your name, email and password.'
    }

    if (password.length < 8) {
      return 'Your password must contain at least 8 characters.'
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address.'
    }

    if (selectedRole !== 'normal_user') {
      if (!phone.trim() || !location.trim()) {
        return 'Please enter your phone number and location.'
      }
    }

    return ''
  }

  function validateRoleDetails() {
    if (selectedRole === 'volunteer') {
      if (
        !currentProfile.service_area?.trim() ||
        !currentProfile.availability ||
        !currentProfile.transport ||
        !(currentProfile.preferred_tasks || []).length
      ) {
        return 'Please complete your service area, tasks, availability and transport.'
      }
    }

    if (selectedRole === 'ngo') {
      if (
        !currentProfile.organisation_name?.trim() ||
        !currentProfile.organisation_type ||
        !currentProfile.registration_number?.trim() ||
        !currentProfile.contact_person?.trim() ||
        !currentProfile.services?.trim()
      ) {
        return 'Please complete all organisation details.'
      }
    }

    if (selectedRole === 'blood_bank') {
      if (
        !currentProfile.facility_name?.trim() ||
        !currentProfile.registration_number?.trim() ||
        !currentProfile.contact_person?.trim() ||
        !(currentProfile.blood_groups || []).length ||
        !currentProfile.operating_hours?.trim()
      ) {
        return 'Please complete all blood bank details.'
      }
    }

    return ''
  }

  function validateDocuments() {
    for (const document of requiredDocuments) {
      if (!documents[document.key]) {
        return `Please upload ${document.label.toLowerCase()}.`
      }

      const file = documents[document.key]
      const extension = file.name.split('.').pop()?.toLowerCase()

      if (!['pdf', 'png', 'jpg', 'jpeg'].includes(extension)) {
        return `${document.label} must be a PDF, PNG or JPG file.`
      }

      if (file.size === 0 || file.size > 5 * 1024 * 1024) {
        return `${document.label} must be smaller than 5 MB and not empty.`
      }
    }

    return ''
  }

  function continueRegistration() {
    setError('')

    const basicError = validateBasicDetails()
    if (basicError) {
      setError(basicError)
      return
    }

    if (isSimpleSignup) {
      submitRegistration()
      return
    }

    setStep(2)
  }

  function continueToDocuments() {
    setError('')

    const detailsError = validateRoleDetails()
    if (detailsError) {
      setError(detailsError)
      return
    }

    setStep(3)
  }

  async function submitRegistration(event) {
    event?.preventDefault()
    setError('')

    if (isSignup) {
      const basicError = validateBasicDetails()
      if (basicError) {
        setError(basicError)
        setStep(1)
        return
      }

      if (!isSimpleSignup) {
        const detailsError = validateRoleDetails()
        if (detailsError) {
          setError(detailsError)
          setStep(2)
          return
        }

        const documentError = validateDocuments()
        if (documentError) {
          setError(documentError)
          setStep(3)
          return
        }
      }
    }

    setLoading(true)

    try {
      const endpoint = isSignup ? 'register' : 'login'
      let body
      const headers = {}

      if (isSignup && selectedRole !== 'normal_user') {
        body = new FormData()
        body.append('name', name.trim())
        body.append('email', email.trim().toLowerCase())
        body.append('password', password)
        body.append('role', selectedRole)
        body.append('phone', phone.trim())
        body.append('location', location.trim())
        body.append('profile_data', JSON.stringify(currentProfile))

        for (const document of requiredDocuments) {
          body.append(document.key, documents[document.key])
        }
      } else {
        headers['Content-Type'] = 'application/json'
        body = JSON.stringify(
          isSignup
            ? {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
                role: selectedRole,
              }
            : {
                email: email.trim().toLowerCase(),
                password,
              },
        )
      }

      const response = await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers,
        body,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Something went wrong. Please try again.')
      }

      if (!data.access_token || !data.user) {
        throw new Error('The server response is missing account login details.')
      }

      localStorage.setItem('relink_token', data.access_token)
      localStorage.setItem('resqlink_token', data.access_token)
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('relink_user', JSON.stringify(data.user))
      localStorage.setItem('resqlink_user', JSON.stringify(data.user))
      localStorage.setItem('user', JSON.stringify(data.user))

      
      if (onLogin) onLogin(data.user)
      if (onClose) onClose()
    } catch (err) {
      setError(
        err instanceof TypeError
          ? 'Cannot reach the ResQlink backend. Start the “Run ResQlink” task in VS Code, then try again.'
          : err.message ||
            'Unable to connect to ResQlink. Please check that the backend is running.',
      )
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Basic details' },
    { number: 2, title: 'Role details' },
    { number: 3, title: 'Documents' },
  ]

  return (
    <div className="auth-shell fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-3 backdrop-blur-md sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative my-auto grid w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl lg:min-h-[700px] lg:grid-cols-[0.85fr_1.15fr]"
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close authentication"
            className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
          >
            <span className="text-xl">×</span>
          </button>
        )}

        <aside className="relative hidden overflow-hidden bg-[#edf6ef] p-9 lg:flex lg:flex-col">
          <div className="absolute -left-20 top-36 h-64 w-64 rounded-full bg-emerald-200/50 blur-3xl" />
          <div className="absolute -right-16 bottom-24 h-72 w-72 rounded-full bg-lime-200/50 blur-3xl" />

          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white shadow-lg">
              <HeartHandshake size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-emerald-950">
                ResQlink
              </h1>
              <p className="text-xs font-semibold tracking-wide text-emerald-800">
                CONNECT · CONTRIBUTE · CARE
              </p>
            </div>
          </div>

          <div className="relative z-10 mt-14">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
              <Sparkles size={16} />
              Small acts. Lasting impact.
            </p>
            <h2 className="max-w-md text-4xl font-black leading-tight tracking-tight text-slate-900 xl:text-5xl">
              Give what you don't need.
              <span className="mt-2 block font-serif font-medium italic text-emerald-700">
                Someone needs it.
              </span>
            </h2>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
              Connect with people, volunteers, community organisations and
              blood banks. Every contribution can help create a better tomorrow.
            </p>
          </div>

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="relative z-10 mt-9 overflow-hidden rounded-3xl border-4 border-white shadow-xl"
          >
            <img
              src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1200&q=85"
              alt="Volunteers working together in a community"
              className="h-64 w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-emerald-950/90 to-transparent p-5 pt-16 text-white">
              <p className="text-xl font-bold">Together, we make a difference.</p>
              <p className="mt-1 text-sm text-white/85">
                One donation. One delivery. One brighter future.
              </p>
            </div>
          </motion.div>

          <div className="relative z-10 mt-auto grid grid-cols-3 gap-3 pt-8">
            {[
              { icon: HandHeart, title: 'Donate' },
              { icon: Users, title: 'Connect' },
              { icon: ShieldCheck, title: 'Support' },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white bg-white/80 p-3 text-center shadow-sm"
                >
                  <Icon size={22} className="mx-auto mb-2 text-emerald-700" />
                  <p className="text-sm font-bold text-slate-800">{item.title}</p>
                </div>
              )
            })}
          </div>
        </aside>

        <main className="max-h-[94vh] overflow-y-auto px-5 py-8 sm:px-9 sm:py-10 lg:px-12">
          <div className="mx-auto w-full max-w-xl">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                <HeartHandshake size={26} />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold text-emerald-950">ResQlink</h1>
                <p className="text-xs text-slate-500">Connect · Contribute · Care</p>
              </div>
            </div>

            <div className="mb-7 flex gap-2 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => changeMode('signin')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === 'signin'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => changeMode('signup')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === 'signup'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create account
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${mode}-${step}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
              >
                {mode === 'signin' ? (
                  <>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
                      Welcome back
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                      Sign in to ResQlink
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Continue connecting resources with the people who need them.
                    </p>

                    <form onSubmit={submitRegistration} className="mt-7 space-y-5">
                      <TextInput
                        label="Email address"
                        icon={Mail}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                      />
                      <Field label="Password" icon={LockKeyhole} required>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className={`${inputClass} pl-10 pr-12`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </Field>

                      <p className="text-xs leading-5 text-slate-500">
                        Admin access is managed separately and cannot be created
                        from public signup.
                      </p>

                      {error && (
                        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                          {error}
                        </p>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? 'Please wait...' : 'Sign in'}
                        {!loading && <ArrowRight size={18} />}
                      </button>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                      New to ResQlink?{' '}
                      <button
                        type="button"
                        onClick={() => changeMode('signup')}
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        Create an account
                      </button>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
                      {step === 1 ? 'Join the community' : step === 2 ? 'Your profile' : 'Final step'}
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                      {step === 1
                        ? 'Create your account'
                        : step === 2
                          ? `Tell us about your ${selectedRoleInfo?.title.toLowerCase()} role`
                          : 'Upload your documents'}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {step === 1
                        ? 'Choose how you would like to participate in ResQlink.'
                        : step === 2
                          ? 'These details help us connect you with the right community activities.'
                          : 'Upload the documents needed for your account type.'}
                    </p>

                    {selectedRole !== 'normal_user' && (
                      <div className="mt-6 grid grid-cols-3 gap-2">
                        {steps.map((item) => (
                          <div key={item.number}>
                            <div
                              className={`h-1.5 rounded-full ${
                                step >= item.number ? 'bg-emerald-600' : 'bg-slate-200'
                              }`}
                            />
                            <p className={`mt-2 text-[11px] font-semibold ${
                              step === item.number ? 'text-emerald-800' : 'text-slate-400'
                            }`}>
                              {item.title}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <form
                      className="mt-7 space-y-5"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (step === 1) continueRegistration()
                        else if (step === 2) continueToDocuments()
                        else submitRegistration()
                      }}
                    >
                      {step === 1 && (
                        <>
                          <div>
                            <p className={labelClass}>Choose your account type</p>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {roles.map((role) => {
                                const Icon = role.icon
                                const selected = selectedRole === role.id

                                return (
                                  <button
                                    type="button"
                                    key={role.id}
                                    onClick={() => {
                                      setSelectedRole(role.id)
                                      setError('')
                                    }}
                                    className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${
                                      selected
                                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100'
                                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                      selected ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      <Icon size={21} />
                                    </span>
                                    <span>
                                      <span className="block text-sm font-bold text-slate-900">
                                        {role.title}
                                      </span>
                                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                                        {role.description}
                                      </span>
                                    </span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          <TextInput
                            label="Full name"
                            icon={UserRound}
                            placeholder="Enter your full name"
                            autoComplete="name"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            required
                          />

                          <TextInput
                            label="Email address"
                            icon={Mail}
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                          />

                          <Field label="Password" icon={LockKeyhole} required>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="new-password"
                              placeholder="At least 8 characters"
                              value={password}
                              onChange={(event) => setPassword(event.target.value)}
                              className={`${inputClass} pl-10 pr-12`}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </Field>

                          {!isSimpleSignup && (
                            <>
                              <TextInput
                                label="Mobile number"
                                icon={Phone}
                                type="tel"
                                autoComplete="tel"
                                placeholder="Enter your contact number"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                required
                              />
                              <TextInput
                                label="City / service location"
                                icon={MapPin}
                                autoComplete="address-level2"
                                placeholder="e.g. Mysuru"
                                value={location}
                                onChange={(event) => setLocation(event.target.value)}
                                required
                              />
                            </>
                          )}
                        </>
                      )}

                      {step === 2 && selectedRole === 'volunteer' && (
                        <>
                          <TextInput
                            label="Service area"
                            icon={MapPin}
                            placeholder="City or areas you can serve"
                            value={currentProfile.service_area || ''}
                            onChange={(event) => updateProfile('service_area', event.target.value)}
                            required
                          />

                          <div>
                            <p className={labelClass}>Preferred tasks *</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {taskOptions.map((task) => (
                                <label key={task} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm text-slate-700 hover:bg-emerald-50">
                                  <input
                                    type="checkbox"
                                    checked={(currentProfile.preferred_tasks || []).includes(task)}
                                    onChange={() => toggleArrayValue('preferred_tasks', task)}
                                    className="h-4 w-4 accent-emerald-700"
                                  />
                                  {task}
                                </label>
                              ))}
                            </div>
                          </div>

                          <Field label="Availability" icon={Clock} required>
                            <select
                              className={inputClass}
                              value={currentProfile.availability || ''}
                              onChange={(event) => updateProfile('availability', event.target.value)}
                              required
                            >
                              <option value="">Select availability</option>
                              <option value="Weekdays">Weekdays</option>
                              <option value="Weekends">Weekends</option>
                              <option value="Evenings">Evenings</option>
                              <option value="Flexible">Flexible</option>
                            </select>
                          </Field>

                          <Field label="Transport option" icon={Car} required>
                            <select
                              className={inputClass}
                              value={currentProfile.transport || ''}
                              onChange={(event) => updateProfile('transport', event.target.value)}
                              required
                            >
                              <option value="">Select transport option</option>
                              <option value="Two-wheeler">Two-wheeler</option>
                              <option value="Car">Car</option>
                              <option value="Public transport">Public transport</option>
                              <option value="Walking">Walking</option>
                              <option value="No transport">No transport available</option>
                            </select>
                          </Field>

                          <Field label="Short introduction (optional)">
                            <textarea
                              rows={3}
                              maxLength={500}
                              className={inputClass}
                              placeholder="Tell the community how you would like to help."
                              value={currentProfile.introduction || ''}
                              onChange={(event) => updateProfile('introduction', event.target.value)}
                            />
                          </Field>
                        </>
                      )}

                      {step === 2 && selectedRole === 'ngo' && (
                        <>
                          <TextInput
                            label="Organisation name"
                            icon={Building2}
                            placeholder="Registered organisation name"
                            value={currentProfile.organisation_name || ''}
                            onChange={(event) => updateProfile('organisation_name', event.target.value)}
                            required
                          />

                          <Field label="Organisation type" icon={BriefcaseBusiness} required>
                            <select
                              className={inputClass}
                              value={currentProfile.organisation_type || ''}
                              onChange={(event) => updateProfile('organisation_type', event.target.value)}
                              required
                            >
                              <option value="">Select organisation type</option>
                              <option value="NGO">NGO</option>
                              <option value="Ashram">Ashram</option>
                              <option value="Charitable trust">Charitable trust</option>
                              <option value="Community organisation">Community organisation</option>
                            </select>
                          </Field>

                          <TextInput
                            label="Registration number"
                            placeholder="Official registration number"
                            value={currentProfile.registration_number || ''}
                            onChange={(event) => updateProfile('registration_number', event.target.value)}
                            required
                          />

                          <TextInput
                            label="Contact person"
                            icon={UserRound}
                            placeholder="Representative's full name"
                            value={currentProfile.contact_person || ''}
                            onChange={(event) => updateProfile('contact_person', event.target.value)}
                            required
                          />

                          <Field label="Services and community support offered" required>
                            <textarea
                              rows={3}
                              className={inputClass}
                              placeholder="Describe the services your organisation offers"
                              value={currentProfile.services || ''}
                              onChange={(event) => updateProfile('services', event.target.value)}
                              required
                            />
                          </Field>
                        </>
                      )}

                      {step === 2 && selectedRole === 'blood_bank' && (
                        <>
                          <TextInput
                            label="Blood bank / facility name"
                            icon={Building2}
                            placeholder="Official facility name"
                            value={currentProfile.facility_name || ''}
                            onChange={(event) => updateProfile('facility_name', event.target.value)}
                            required
                          />

                          <TextInput
                            label="Registration / licence number"
                            placeholder="Facility registration or licence number"
                            value={currentProfile.registration_number || ''}
                            onChange={(event) => updateProfile('registration_number', event.target.value)}
                            required
                          />

                          <TextInput
                            label="Contact person"
                            icon={UserRound}
                            placeholder="Responsible representative"
                            value={currentProfile.contact_person || ''}
                            onChange={(event) => updateProfile('contact_person', event.target.value)}
                            required
                          />

                          <div>
                            <p className={labelClass}>Blood groups handled *</p>
                            <div className="grid grid-cols-4 gap-2">
                              {bloodGroups.map((group) => (
                                <label key={group} className={`flex cursor-pointer items-center justify-center gap-1 rounded-xl border p-3 text-sm font-bold ${
                                  (currentProfile.blood_groups || []).includes(group)
                                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                                    : 'border-slate-200 text-slate-600'
                                }`}>
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={(currentProfile.blood_groups || []).includes(group)}
                                    onChange={() => toggleArrayValue('blood_groups', group)}
                                  />
                                  {group}
                                </label>
                              ))}
                            </div>
                          </div>

                          <TextInput
                            label="Operating hours"
                            icon={Clock}
                            placeholder="e.g. Mon–Sat, 9 AM–6 PM"
                            value={currentProfile.operating_hours || ''}
                            onChange={(event) => updateProfile('operating_hours', event.target.value)}
                            required
                          />
                        </>
                      )}

                      {step === 3 && (
                        <>
                          <div className="rounded-2xl bg-emerald-50 p-4">
                            <div className="flex items-start gap-3">
                              <ShieldCheck size={22} className="mt-0.5 shrink-0 text-emerald-700" />
                              <div>
                                <p className="font-bold text-emerald-950">Your documents</p>
                                <p className="mt-1 text-sm leading-6 text-emerald-800">
                                  Upload clear, readable files. Accepted formats are PDF, PNG and JPG, up to 5 MB each.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {requiredDocuments.map((document) => (
                              <FileField
                                key={document.key}
                                label={document.label}
                                file={documents[document.key]}
                                onChange={(file) => {
                                  setDocuments((previous) => ({
                                    ...previous,
                                    [document.key]: file,
                                  }))
                                  setError('')
                                }}
                              />
                            ))}
                          </div>

                          <div className="rounded-2xl border border-slate-200 p-4">
                            <p className="font-bold text-slate-900">Ready to submit?</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              You can sign in after submitting. Volunteer, organisation, and blood bank accounts remain pending until an administrator reviews the required documents; publishing resources is enabled after approval.
                            </p>
                          </div>
                        </>
                      )}

                      {error && (
                        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm leading-5 text-rose-700">
                          {error}
                        </p>
                      )}

                      <div className="flex gap-3 pt-1">
                        {step > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setError('')
                              setStep(step - 1)
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            <ArrowLeft size={17} />
                            Back
                          </button>
                        )}

                        <button
                          type="submit"
                          disabled={loading}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading
                            ? 'Please wait...'
                            : step === 1 && isSimpleSignup
                              ? 'Create account'
                              : step === 1
                                ? 'Continue'
                                : step === 2
                                  ? 'Continue to documents'
                                  : 'Create account'}
                          {!loading && <ArrowRight size={18} />}
                        </button>
                      </div>
                    </form>

                    <p className="mt-6 text-center text-sm text-slate-500">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => changeMode('signin')}
                        className="font-bold text-emerald-700 hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400">
              <ShieldCheck size={15} />
              Your information is handled by the ResQlink service.
            </div>
          </div>
        </main>
      </motion.div>
    </div>
  )
}
