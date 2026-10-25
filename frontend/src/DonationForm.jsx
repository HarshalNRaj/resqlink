
import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  PackagePlus,
  MapPin,
  BookOpen,
  Utensils,
  Shirt,
  Heart,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  X,
  ImagePlus,
  Truck,
} from 'lucide-react'
import { getAccessToken } from './verification'

const API_URL = 'http://127.0.0.1:5000/api/resources'

const FILTER_CATEGORIES = [
  'All',
  'Food',
  'Clothes',
  'Books',
  'Essentials',
  'Other',
]

const initialForm = {
  title: '',
  category: 'Food',
  description: '',
  location: '',
  quantity: '',
}

const categoryOptions = [
  { value: 'Food', label: 'Food', icon: Utensils },
  { value: 'Clothes', label: 'Clothes', icon: Shirt },
  { value: 'Books', label: 'Books', icon: BookOpen },
  { value: 'Essentials', label: 'Essentials', icon: Heart },
  { value: 'Other', label: 'Other', icon: PackagePlus },
]

export default function DonationForm({ mode = 'all' }) {
  const [form, setForm] = useState(initialForm)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const photoInputRef = useRef(null)
  const [resources, setResources] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [requestingResource, setRequestingResource] = useState(null)
  const [requestForm, setRequestForm] = useState({
    requester_name: '',
    contact: '',
    message: '',
    fulfillment_method: 'pickup',
    delivery_address: '',
  })
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [requestNotice, setRequestNotice] = useState('')
  const [requestError, setRequestError] = useState('')

  function handlePhotoChange(event) {
    const selectedPhoto = event.target.files?.[0] || null
    setPhoto(selectedPhoto)
    setPhotoPreview('')
    if (!selectedPhoto) return
    if (selectedPhoto.size > 5 * 1024 * 1024) {
      setPhoto(null)
      setError('Resource photo must be no larger than 5 MB.')
      event.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(String(reader.result || ''))
    reader.onerror = () => setError('The selected resource photo could not be previewed.')
    reader.readAsDataURL(selectedPhoto)
  }

  const fetchResources = useCallback(async (category = 'All') => {
    const url =
      category === 'All'
        ? API_URL
        : `${API_URL}?category=${encodeURIComponent(category)}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error('Unable to load resources.')
    }

    const data = await response.json()
    return data.resources || []
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchResources(selectedCategory)
      .then((items) => {
        if (!cancelled) {
          setResources(items)
          setError('')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResources([])
          setError(
            'Could not connect to ResQlink. Please check whether the backend is running.'
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [fetchResources, selectedCategory])

  function refreshResources(category = selectedCategory) {
    setLoading(true)
    setError('')
    return fetchResources(category)
      .then((items) => setResources(items))
      .catch(() => {
        setResources([])
        setError(
          'Could not connect to ResQlink. Please check whether the backend is running.'
        )
      })
      .finally(() => setLoading(false))
  }

  function handleCategoryChange(category) {
    setLoading(true)
    setError('')
    setSelectedCategory(category)
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))

    setMessage('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setSubmitting(true)
    setMessage('')
    setError('')

    try {
      const body = new FormData()
      Object.entries(form).forEach(([key, value]) => body.append(key, value))
      if (photo) body.append('photo', photo)
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Could not submit your donation.'
        )
      }

      setMessage('Your resource has been listed successfully!')
      setForm(initialForm)
      setPhoto(null)
      setPhotoPreview('')
      if (photoInputRef.current) photoInputRef.current.value = ''
      setSearchTerm('')

      // Show the newly added resource, even if another category was selected.
      setSelectedCategory(form.category)

      // Refresh immediately using the submitted resource category.
      await refreshResources(form.category)
    } catch (err) {
      setError(
        err.message || 'Something went wrong. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function handleRequestFormChange(event) {
    const { name, value } = event.target
    setRequestForm((current) => ({ ...current, [name]: value }))
    setRequestNotice('')
    setRequestError('')
  }

  async function handleRequestSubmit(event) {
    event.preventDefault()
    if (!requestingResource) return

    setRequestSubmitting(true)
    setRequestNotice('')
    setRequestError('')

    try {
      const response = await fetch('http://127.0.0.1:5000/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({
          resource_id: String(requestingResource.id),
          ...requestForm,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Could not submit your request.')
      }

      setRequestNotice(data.message || 'Your request has been submitted!')
      setRequestForm({
        requester_name: '',
        contact: '',
        message: '',
        fulfillment_method: 'pickup',
        delivery_address: '',
      })
      setRequestingResource(null)
    } catch (err) {
      setRequestError(err.message || 'Could not submit your request. Please try again.')
    } finally {
      setRequestSubmitting(false)
    }
  }

  const filteredResources = resources.filter((resource) => {
    const searchableText = [
      resource.title,
      resource.description,
      resource.location,
      resource.category,
      resource.quantity,
    ]
      .join(' ')
      .toLowerCase()

    return searchableText.includes(searchTerm.trim().toLowerCase())
  })

  return (
    <section
      id="donation-board"
      className={`scroll-mt-24 bg-[#f8faf7] px-3 py-5 sm:px-5 sm:py-7 donation-view donation-view-${mode}`}
    >
      <div className="mx-auto w-full max-w-none">
        {/* Section heading */}
        {mode !== 'browse' && <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6 max-w-3xl text-left"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
            <Heart size={22} />
          </span>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            Give what you can · community exchange
          </p>

          <h2 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            One useful item can make a real difference.
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
            Offer what you can, discover what your neighbors need, and turn small acts into meaningful support.
          </p>
        </motion.div>}

        <div className={mode === 'all' ? "grid items-start gap-5 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.45fr)] 2xl:gap-7" : "grid items-start gap-5"}>
          {/* Donation form */}
          {mode !== 'browse' && <motion.form
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-emerald-950/5 sm:p-6"
          >
            <h3 className="text-2xl font-bold">Offer a donation</h3>

            <p className="mt-2 text-sm text-slate-500">
              Fill in the details of the resource you can share.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="resource-title"
                  className="mb-2 block text-sm font-semibold"
                >
                  Resource name
                </label>

                <input
                  id="resource-title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={100}
                  placeholder="e.g. Fresh vegetables"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label
                  htmlFor="resource-category"
                  className="mb-2 block text-sm font-semibold"
                >
                  Category
                </label>

                <select
                  id="resource-category"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                >
                  {categoryOptions.map((category) => (
                    <option
                      key={category.value}
                      value={category.value}
                    >
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="resource-description"
                  className="mb-2 block text-sm font-semibold"
                >
                  Description
                </label>

                <textarea
                  id="resource-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  required
                  maxLength={500}
                  rows={3}
                  placeholder="Describe the condition or details..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="resource-location"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Location
                  </label>

                  <input
                    id="resource-location"
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    required
                    maxLength={150}
                    placeholder="e.g. Mysuru"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="resource-quantity"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Quantity
                  </label>

                  <input
                    id="resource-quantity"
                    name="quantity"
                    value={form.quantity}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    placeholder="e.g. 5 kg"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="resource-photo" className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <ImagePlus size={17} /> Resource photo (optional)
                </label>
                <input
                  id="resource-photo"
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-100 file:px-3 file:py-2 file:font-semibold file:text-violet-800"
                  aria-describedby="resource-photo-help"
                />
                <p id="resource-photo-help" className="mt-1 text-xs text-slate-500">
                  JPG, PNG, or WebP, up to 5 MB. The photo appears on the available resource card.
                </p>
                {photo && (
                  <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 overflow-hidden rounded-xl border border-violet-200">
                    <img src={photoPreview} alt="Donation preview" className="h-40 w-full object-cover" />
                  </motion.div>
                )}
              </div>

              {message && (
                <p
                  role="status"
                  className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
                >
                  <CheckCircle2 size={18} />
                  {message}
                </p>
              )}

              {error && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700"
                >
                  <AlertCircle size={18} />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-4 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <LoaderCircle
                      className="animate-spin"
                      size={19}
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <PackagePlus size={19} />
                    Publish donation
                  </>
                )}
              </button>
            </div>
          </motion.form>}

          {/* Community board */}
          {mode !== 'donate' && <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-emerald-950/5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
                  Community board
                </p>

                <h3 className="mt-2 text-2xl font-bold">
                  Available resources
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Find items shared by your community.
                </p>
              </div>

              <span
                className="rounded-2xl bg-emerald-100 px-4 py-3 text-lg font-extrabold text-emerald-800"
                aria-label={`${filteredResources.length} resources displayed`}
              >
                {filteredResources.length}
              </span>
            </div>

            {/* Live search */}
            <div className="mt-6">
              <label
                htmlFor="resource-search"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Search resources
              </label>

              <div className="relative">
                <Search
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="resource-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search name, location, quantity..."
                  className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-11 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    aria-label="Clear search"
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={17} />
                  </button>
                )}
              </div>
            </div>

            {/* Category filter */}
            <div className="mt-4">
              <label
                htmlFor="resource-filter"
                className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700"
              >
                <Filter size={16} />
                Filter by category
              </label>

              <select
                id="resource-filter"
                value={selectedCategory}
                onChange={(event) =>
                  handleCategoryChange(event.target.value)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
              >
                {FILTER_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category === 'All' ? 'All categories' : category}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource results */}
            {loading ? (
              <div
                className="flex items-center justify-center gap-3 py-14 text-slate-500"
                role="status"
              >
                <LoaderCircle
                  className="animate-spin"
                  size={22}
                />
                Loading resources...
              </div>
            ) : error && resources.length === 0 ? (
              <div className="py-10 text-center text-sm text-red-600">
                <AlertCircle
                  className="mx-auto mb-3"
                  size={28}
                />

                <p>{error}</p>

                <button
                  type="button"
                  onClick={() => refreshResources()}
                  className="mx-auto mt-4 block rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white transition hover:bg-emerald-800"
                >
                  Try again
                </button>
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="py-14 text-center text-slate-500">
                <PackagePlus
                  className="mx-auto mb-3 text-emerald-700"
                  size={32}
                />

                <p className="font-semibold">
                  No matching resources found.
                </p>

                <p className="mt-2 text-sm">
                  Try another search term or category.
                </p>

                {(searchTerm || selectedCategory !== 'All') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory('All')
                    }}
                    className="mt-4 rounded-lg border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 2xl:grid-cols-2">
                {filteredResources.map((resource) => {
                  const category = categoryOptions.find(
                    (item) => item.value === resource.category
                  )

                  const Icon = category?.icon || PackagePlus

                  return (
                    <motion.article
                      layout
                      whileHover={{ y: -4, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                      key={resource.id}
                      className="rounded-2xl border border-slate-100 bg-[#fcfdfb] p-4 transition hover:border-emerald-200 hover:shadow-md"
                    >
                      {resource.photo_url && (
                        <motion.img
                          initial={{ opacity: 0, scale: 1.04 }}
                          animate={{ opacity: 1, scale: 1 }}
                          src={`http://127.0.0.1:5000${resource.photo_url}`}
                          alt={`${resource.title} donation`}
                          loading="lazy"
                          className="mb-4 h-48 w-full rounded-xl object-cover"
                        />
                      )}
                      <div className="flex items-start gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                          <Icon size={23} />
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="font-bold">
                              {resource.title}
                            </h4>

                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                              {resource.status || 'Available'}
                            </span>
                          </div>

                          <p className="mt-1 text-xs font-semibold text-emerald-700">
                            {resource.category}
                          </p>

                          <p className="mt-3 text-sm leading-6 text-slate-600">
                            {resource.description}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                              <MapPin size={14} />
                              {resource.location}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <PackagePlus size={14} />
                              {resource.quantity}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4">
                        {requestNotice && (
                          <p role="status" className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                            {requestNotice}
                          </p>
                        )}

                        {requestingResource?.id === resource.id ? (
                          <form onSubmit={handleRequestSubmit} className="space-y-3">
                            <h5 className="font-semibold text-slate-800">
                              Request {resource.title}
                            </h5>
                            <input
                              name="requester_name"
                              value={requestForm.requester_name}
                              onChange={handleRequestFormChange}
                              required
                              placeholder="Your full name"
                              aria-label="Your full name"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                            />
                            <input
                              name="contact"
                              value={requestForm.contact}
                              onChange={handleRequestFormChange}
                              required
                              placeholder="Phone number or email"
                              aria-label="Phone number or email"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                            />
                            <textarea
                              name="message"
                              value={requestForm.message}
                              onChange={handleRequestFormChange}
                              required
                              rows={3}
                              placeholder="Why do you need this resource?"
                              aria-label="Reason for requesting this resource"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                            />
                            <label className="block text-sm font-semibold text-slate-700" htmlFor={`fulfillment-${resource.id}`}>
                              How should this reach you?
                            </label>
                            <select
                              id={`fulfillment-${resource.id}`}
                              name="fulfillment_method"
                              value={requestForm.fulfillment_method}
                              onChange={handleRequestFormChange}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                            >
                              <option value="pickup">I can pick it up</option>
                              <option value="delivery">I need volunteer delivery</option>
                            </select>
                            {requestForm.fulfillment_method === 'delivery' && (
                              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700" htmlFor={`delivery-address-${resource.id}`}>
                                  Delivery destination
                                </label>
                                <textarea
                                  id={`delivery-address-${resource.id}`}
                                  name="delivery_address"
                                  value={requestForm.delivery_address}
                                  onChange={handleRequestFormChange}
                                  required={requestForm.fulfillment_method === 'delivery'}
                                  maxLength={300}
                                  rows={2}
                                  placeholder="Enter the delivery address or clear meeting point"
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
                                />
                                <p className="flex items-center gap-2 rounded-lg bg-violet-50 p-2.5 text-xs text-violet-800">
                                  <Truck size={15} /> Your destination is hidden from volunteers until one claims the accepted task.
                                </p>
                              </motion.div>
                            )}
                            {requestError && (
                              <p role="alert" className="text-sm text-red-600">{requestError}</p>
                            )}
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="submit"
                                disabled={requestSubmitting}
                                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {requestSubmitting ? 'Submitting...' : 'Submit request'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setRequestingResource(null)
                                  setRequestError('')
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setRequestingResource(resource)
                              setRequestNotice('')
                              setRequestError('')
                            }}
                            className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 focus:outline-none focus:ring-4 focus:ring-emerald-200"
                          >
                            Request this resource
                          </button>
                        )}
                      </div>
                    </motion.article>
                  )
                })}
              </div>
            )}

            <p className="mt-6 text-xs leading-5 text-slate-400">
              Listings and requests are saved to the configured ResQlink database.
            </p>
          </div>}
        </div>
      </div>
    </section>
  )
}
