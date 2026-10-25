import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  AlertCircle,
  Building2,
  Crosshair,
  Droplets,
  LocateFixed,
  MapPin,
  MapPinned,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const API_BASE_URL = 'http://127.0.0.1:5000'
const DEFAULT_CENTER = [20, 0]

function nearbyQuery({ search, type, center, radius }) {
  const params = new URLSearchParams()
  if (search.trim()) params.set('q', search.trim())
  if (type !== 'all') params.set('type', type)
  if (center) {
    params.set('lat', String(center.latitude))
    params.set('lng', String(center.longitude))
    params.set('radius_km', radius)
  }
  return params.toString()
}

function DirectoryMap({ organizations, center, onSelect }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return undefined

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView(DEFAULT_CENTER, 2)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)
    layerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layer = layerRef.current
    if (!map || !layer) return
    layer.clearLayers()

    if (center) {
      L.circleMarker([center.latitude, center.longitude], {
        radius: 8,
        color: '#ddd6fe',
        fillColor: '#8b5cf6',
        fillOpacity: 0.95,
        weight: 3,
      }).bindPopup('Your search location').addTo(layer)
      map.setView([center.latitude, center.longitude], 10, { animate: true })
    }

    const bounds = []
    for (const organization of organizations) {
      if (!Number.isFinite(organization.latitude) || !Number.isFinite(organization.longitude)) continue
      const isBloodBank = organization.role === 'blood_bank'
      const marker = L.circleMarker([organization.latitude, organization.longitude], {
        radius: 9,
        color: isBloodBank ? '#fecdd3' : '#ddd6fe',
        fillColor: isBloodBank ? '#e11d48' : '#7c3aed',
        fillOpacity: 0.96,
        weight: 2,
      })
      const popupContent = document.createElement('div')
      const title = document.createElement('strong')
      title.textContent = organization.name
      popupContent.append(title)
      const meta = document.createElement('div')
      meta.textContent = `${isBloodBank ? 'Blood bank' : 'NGO / Ashram'}${organization.city ? ` · ${organization.city}` : ''}`
      popupContent.append(meta)
      if (organization.distance_km !== undefined) {
        const distance = document.createElement('div')
        distance.textContent = `${organization.distance_km} km straight-line distance`
        popupContent.append(distance)
      }
      marker.bindPopup(popupContent)
      marker.on('click', () => onSelect(organization.id))
      marker.addTo(layer)
      bounds.push([organization.latitude, organization.longitude])
    }

    if (center) bounds.push([center.latitude, center.longitude])
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 12 })
    else if (bounds.length === 1) map.setView(bounds[0], center ? 9 : 11)
    else if (!center) map.setView(DEFAULT_CENTER, 2)
  }, [center, organizations, onSelect])

  return (
    <div className="nearby-map-frame">
      <div ref={containerRef} className="nearby-map" role="region" aria-label="Map of verified nearby organizations" />
      <p className="nearby-map-attribution">Map tiles &copy; OpenStreetMap contributors. Only organizations that opted into sharing an approximate service-area location appear as markers.</p>
    </div>
  )
}

export default function NearbyExplorer() {
  const [organizations, setOrganizations] = useState([])
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [locationQuery, setLocationQuery] = useState('')
  const [type, setType] = useState('all')
  const [radius, setRadius] = useState('50')
  const [center, setCenter] = useState(null)
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(true)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const fetchOrganizations = useCallback(async (options = {}) => {
    setLoading(true)
    setError('')
    try {
      const query = nearbyQuery({
        search,
        type,
        center: options.center ?? center,
        radius,
      })
      const response = await fetch(`${API_BASE_URL}/api/nearby${query ? `?${query}` : ''}`)
      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load the nearby directory.')
      }
      setOrganizations(Array.isArray(data.organizations) ? data.organizations : [])
    } catch (fetchError) {
      setError(fetchError.message || 'Unable to load the nearby directory.')
      setOrganizations([])
    } finally {
      setLoading(false)
    }
  }, [center, radius, search, type])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => fetchOrganizations(), 0)
    return () => window.clearTimeout(timeoutId)
  }, [fetchOrganizations])

  const focusLocation = useCallback((location) => {
    setCenter({
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    })
    setNotice(location.label || 'Showing organizations within the selected radius.')
  }, [])

  function locateMe() {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser. Search for a city or locality instead.')
      return
    }
    setLocating(true)
    setError('')
    setNotice('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        focusLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          label: 'Using your current location for this search only. It is not saved.',
        })
        setLocating(false)
      },
      (locationError) => {
        const message = locationError.code === locationError.PERMISSION_DENIED
          ? 'Location permission was denied. You can still search by city or locality.'
          : locationError.code === locationError.TIMEOUT
            ? 'Location lookup timed out. Please try again or search by city.'
            : 'Could not determine your location. Search by city or locality instead.'
        setError(message)
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function searchLocation(event) {
    event.preventDefault()
    const query = locationQuery.trim()
    if (!query) {
      setError('Enter a city or locality to search.')
      return
    }
    setLocating(true)
    setError('')
    setNotice('')
    try {
      const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1' })
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`)
      if (!response.ok) throw new Error('The map location service is unavailable. Try again later.')
      const results = await response.json()
      if (!results.length) throw new Error('No matching city or locality was found. Try a more specific place name.')
      focusLocation({
        latitude: Number(results[0].lat),
        longitude: Number(results[0].lon),
        label: `Showing results near ${query}.`,
      })
    } catch (geocodeError) {
      setError(geocodeError.message || 'Could not search this location.')
    } finally {
      setLocating(false)
    }
  }

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === selectedId),
    [organizations, selectedId],
  )

  return (
    <section className="nearby-explorer" aria-label="Explore nearby organizations">
      <div className="nearby-search-panel">
        <form className="nearby-search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput) }}>
          <label className="nearby-field">
            <span>Organization or city</span>
            <span className="nearby-input-wrap"><Search size={17} /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name, city, or service area" /></span>
          </label>
          <label className="nearby-field">
            <span>Organization type</span>
            <span className="nearby-input-wrap"><SlidersHorizontal size={17} />
              <select value={type} onChange={(event) => setType(event.target.value)}>
                <option value="all">NGOs, ashrams & blood banks</option>
                <option value="ngo">NGOs & ashrams</option>
                <option value="blood_bank">Blood banks</option>
              </select>
            </span>
          </label>
          {center && (
            <label className="nearby-field nearby-radius">
              <span>Search radius</span>
              <span className="nearby-input-wrap"><Crosshair size={17} />
                <select value={radius} onChange={(event) => setRadius(event.target.value)}>
                  <option value="10">10 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                  <option value="100">100 km</option>
                  <option value="250">250 km</option>
                  <option value="500">500 km</option>
                </select>
              </span>
            </label>
          )}
          <motion.button type="submit" className="nearby-primary-button" whileTap={{ scale: 0.97 }} disabled={loading}>
            <Search size={17} />Find organizations
          </motion.button>
        </form>

        <div className="nearby-location-actions">
          <form onSubmit={searchLocation} className="nearby-location-form">
            <label className="nearby-field">
              <span>Search by city or locality</span>
              <input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="e.g. Mysuru" maxLength={100} />
            </label>
            <button type="submit" className="nearby-secondary-button" disabled={locating}>
              <MapPin size={16} />Search map
            </button>
          </form>
          <button type="button" onClick={locateMe} className="nearby-secondary-button" disabled={locating}>
            <LocateFixed size={16} className={locating ? 'animate-spin' : ''} />
            {locating ? 'Finding location…' : 'Use my location'}
          </button>
          {center && <button type="button" className="nearby-text-button" onClick={() => { setCenter(null); setNotice('Location filter cleared.'); }}>Clear location</button>}
        </div>
        <p className="nearby-privacy-note">Location permission is requested only when you choose “Use my location.” Your position is used for this search and is not saved. City searches use OpenStreetMap Nominatim; enter a city or locality, not a private address.</p>
      </div>

      {notice && <p className="nearby-notice" role="status"><ShieldCheck size={16} />{notice}</p>}
      {error && <div className="nearby-error" role="alert"><AlertCircle size={18} /><span>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}

      <div className="nearby-results-header">
        <div><p className="nearby-kicker">VERIFIED COMMUNITY DIRECTORY</p><h3>{loading ? 'Finding organizations…' : `${organizations.length} ${organizations.length === 1 ? 'organization' : 'organizations'} found`}</h3></div>
        <div className="nearby-view-toggle" role="group" aria-label="Results view">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}><Building2 size={16} />List</button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><MapPinned size={16} />Map</button>
        </div>
      </div>

      {view === 'map' && (
        <DirectoryMap
          organizations={organizations}
          center={center}
          onSelect={setSelectedId}
        />
      )}

      {loading ? (
        <div className="nearby-loading" aria-live="polite"><span className="nearby-loader" /><span>Loading verified organizations from ResQlink…</span></div>
      ) : organizations.length === 0 ? (
        <motion.div className="nearby-empty" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="nearby-empty-icon"><Building2 size={25} /></span>
          <h3>No verified organizations match yet</h3>
          <p>Try a wider radius, another organization type, or a different city. Organizations appear on the map only when they choose to share an approximate service-area location.</p>
        </motion.div>
      ) : (
        <div className="nearby-results-grid">
          {organizations.map((organization, index) => {
            const Icon = organization.role === 'blood_bank' ? Droplets : Building2
            const active = organization.id === selectedId
            return (
              <motion.article
                key={organization.id}
                className={`nearby-card${active ? ' is-selected' : ''}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.045, 0.24), type: 'spring', stiffness: 180, damping: 20 }}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedId(organization.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedId(organization.id)
                    setView('map')
                  }
                }}
                tabIndex={0}
                aria-label={`${organization.name}, ${organization.role === 'blood_bank' ? 'blood bank' : 'NGO or ashram'}`}
              >
                <div className="nearby-card-icon"><Icon size={22} /></div>
                <div className="nearby-card-content">
                  <div className="nearby-card-title-row"><h4>{organization.name}</h4><span className="nearby-verified"><ShieldCheck size={14} />Verified</span></div>
                  <p className="nearby-card-type">{organization.role === 'blood_bank' ? 'Blood bank' : 'NGO / Ashram'}</p>
                  {(organization.city || organization.service_area) && <p className="nearby-card-location"><MapPin size={14} />{[organization.city, organization.service_area].filter(Boolean).join(' · ')}</p>}
                  {organization.distance_km !== undefined && <p className="nearby-distance">{organization.distance_km} km straight-line distance</p>}
                  {!organization.location_shared && <p className="nearby-no-pin">Approximate map location not shared</p>}
                </div>
              </motion.article>
            )
          })}
        </div>
      )}

      {selectedOrganization && view === 'map' && (
        <div className="nearby-selection" role="status">
          <strong>{selectedOrganization.name}</strong>
          <span>{selectedOrganization.city || selectedOrganization.service_area || 'Service area not listed'}</span>
          <button type="button" onClick={() => setSelectedId(null)} aria-label="Clear selected organization">×</button>
        </div>
      )}
      <p className="nearby-data-note">Directory entries come from verified MongoDB accounts. Map markers and distance filtering use only coordinates explicitly shared as approximate service-area locations; missing coordinates are never inferred.</p>
    </section>
  )
}
