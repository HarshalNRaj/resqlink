/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import {
  SupplyDeliveryMission,
  SupplyRunStatus,
  RouteCheckpoint,
  UserRole,
} from '../../types';
import { Button, Card, Modal, NoticeBanner } from '../common/UIComponents';
import { apiService } from '../../services/apiService';
import {
  Truck,
  Navigation,
  MapPin,
  Compass,
  ShieldCheck,
  Phone,
  MessageSquare,
  Share2,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  BatteryCharging,
  Wifi,
  Clock,
  ArrowRight,
  Camera,
  FileCheck,
  Check,
  ChevronRight,
  X,
  Sparkles,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Package,
  Layers,
  Award,
  Radio,
  Activity,
  LocateFixed,
  Navigation2,
  Signal,
  Footprints,
  Gauge,
  Sliders,
  HelpCircle,
  Send,
} from 'lucide-react';

interface VolunteerSupplyTrackerProps {
  mission: SupplyDeliveryMission;
  currentRole?: UserRole;
  onUpdateMission?: (updatedMission: SupplyDeliveryMission) => void;
  onCompleteDelivery?: (
    missionId: string,
    proof: NonNullable<SupplyDeliveryMission['proofOfDelivery']>
  ) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function VolunteerSupplyTracker({
  mission: initialMission,
  currentRole = 'volunteer',
  onUpdateMission,
  onCompleteDelivery,
  onClose,
  isModal = false,
}: VolunteerSupplyTrackerProps) {
  const [mission, setMission] = useState<SupplyDeliveryMission>(initialMission);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialMission.status === 'in_transit');
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 2x, 5x
  const [deviceGpsActive, setDeviceGpsActive] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [mapTheme, setMapTheme] = useState<'schematic' | 'dark' | 'satellite'>('schematic');

  // Volunteer Driver vs Observer mode toggle
  const isVolunteerRole = currentRole === 'volunteer';
  const [driverMode, setDriverMode] = useState<boolean>(isVolunteerRole);

  // Real Device Geolocation State
  const [deviceCoords, setDeviceCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    speed: number | null;
    altitude: number | null;
    heading: number | null;
    timestamp: number;
  } | null>(null);
  const [gpsMode, setGpsMode] = useState<'mysuru_projected' | 'raw_device'>('mysuru_projected');
  const [liveGpsLogs, setLiveGpsLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [lastTelemetryTime, setLastTelemetryTime] = useState<string>('Just now');
  const initialGpsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Modals
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [msgModalOpen, setMsgModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [trafficModalOpen, setTrafficModalOpen] = useState(false);
  const [trafficNote, setTrafficNote] = useState('');
  const [trafficReported, setTrafficReported] = useState<string | null>(null);
  const [shareToast, setShareToast] = useState(false);
  const [quickMsgSent, setQuickMsgSent] = useState<string | null>(null);

  // Handover completion form
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [signatureDone, setSignatureDone] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [photoProof, setPhotoProof] = useState<string | null>(null);

  // Volunteer Dispatch & Speed/Distance Configuration
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [demoModalOpen, setDemoModalOpen] = useState(false);
  const [configuredSpeed, setConfiguredSpeed] = useState<number>(mission.currentSpeedKmh || 35);
  const [configuredDistance, setConfiguredDistance] = useState<number>(mission.totalDistanceKm || 12.8);
  const [fastDemoActive, setFastDemoActive] = useState(false);

  // Dispatch Form State
  const [dispatchForm, setDispatchForm] = useState({
    title: '50 Bags Fortified Wheat Flour (Aata)',
    category: 'Food Rations',
    quantity: '50 bags (10kg each)',
    originCity: 'Mysuru',
    originLocation: 'APMC Market Yard, Bandipalya, Mysuru',
    recipientName: 'Karuna Vridhashram & Child Haven',
    recipientPhone: '+91 98450 22334',
    dropAddress: 'Plot 42, Magadi Road, Rajajinagar, Mysuru corridor',
    speedKmh: 40,
    totalDistanceKm: 14.5,
    deliveryPin: '4921',
  });

  const handleSelectSpeed = (newSpeed: number) => {
    setConfiguredSpeed(newSpeed);
    const newEta = Math.max(1, Math.round((mission.distanceRemainingKm / newSpeed) * 60));
    setMission((prev) => {
      const updated = {
        ...prev,
        currentSpeedKmh: newSpeed,
        estimatedArrivalMinutes: newEta,
      };
      onUpdateMission?.(updated);
      return updated;
    });
  };

  const handleSelectDistance = (newDistance: number) => {
    setConfiguredDistance(newDistance);
    const progress = 1 - (mission.distanceRemainingKm / mission.totalDistanceKm);
    const newRemaining = Math.max(0.1, +(newDistance * (1 - Math.min(0.95, progress))).toFixed(2));
    const newEta = Math.max(1, Math.round((newRemaining / (mission.currentSpeedKmh || 30)) * 60));
    setMission((prev) => {
      const updated = {
        ...prev,
        totalDistanceKm: newDistance,
        distanceRemainingKm: newRemaining,
        estimatedArrivalMinutes: newEta,
      };
      onUpdateMission?.(updated);
      return updated;
    });
  };

  const handleUseCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = +pos.coords.latitude.toFixed(4);
          const lng = +pos.coords.longitude.toFixed(4);
          setDispatchForm((prev) => ({
            ...prev,
            originLocation: `GPS Location (${lat}° N, ${lng}° E) - Mysuru Urban Hub`,
          }));
        },
        () => {
          setDispatchForm((prev) => ({
            ...prev,
            originLocation: 'Mysuru City Hub (Live GPS Fix)',
          }));
        }
      );
    }
  };

  const handleConfirmDispatch = async () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const newMission: SupplyDeliveryMission = {
      ...mission,
      id: `mission-${Date.now().toString().slice(-4)}`,
      trackingNumber: `GC-MYS-${Math.floor(1000 + Math.random() * 9000)}`,
      resourceTitle: dispatchForm.title,
      category: dispatchForm.category,
      quantity: dispatchForm.quantity,
      donorName: 'Mysuru Central Supply Depot',
      pickupLocation: dispatchForm.originLocation,
      pickupAddress: dispatchForm.originLocation,
      recipientName: dispatchForm.recipientName,
      recipientPhone: dispatchForm.recipientPhone,
      dropAddress: dispatchForm.dropAddress,
      totalDistanceKm: dispatchForm.totalDistanceKm,
      distanceRemainingKm: dispatchForm.totalDistanceKm,
      currentSpeedKmh: dispatchForm.speedKmh,
      estimatedArrivalMinutes: Math.max(1, Math.round((dispatchForm.totalDistanceKm / dispatchForm.speedKmh) * 60)),
      status: 'in_transit',
      deliveryPin: pin,
      currentPosition: {
        x: mission.pickupCoords.x,
        y: mission.pickupCoords.y,
        lat: 12.2854,
        lng: 76.6542,
      },
      checkpoints: mission.checkpoints.map((c) => ({ ...c, completed: false, timestamp: undefined })),
    };

    setMission(newMission);
    setConfiguredSpeed(dispatchForm.speedKmh);
    setConfiguredDistance(dispatchForm.totalDistanceKm);
    setIsPlaying(true);
    setDispatchModalOpen(false);
    onUpdateMission?.(newMission);

    try {
      await apiService.dispatchResource({
        title: dispatchForm.title,
        pickupAddress: dispatchForm.originLocation,
        recipientName: dispatchForm.recipientName,
        recipientPhone: dispatchForm.recipientPhone,
        dropAddress: dispatchForm.dropAddress,
        category: dispatchForm.category,
        quantity: dispatchForm.quantity,
        speedKmh: dispatchForm.speedKmh,
        totalDistanceKm: dispatchForm.totalDistanceKm,
        currentCity: dispatchForm.originCity,
      });
    } catch (e) {
      console.warn('Backend dispatch notice:', e);
    }
  };

  const handleRunFastDemo = () => {
    setDemoModalOpen(false);
    setFastDemoActive(true);
    setSimSpeed(5);
    setIsPlaying(true);
    if (mission.status === 'delivered' || mission.distanceRemainingKm < 0.5) {
      setMission((prev) => ({
        ...prev,
        status: 'in_transit',
        distanceRemainingKm: prev.totalDistanceKm,
        estimatedArrivalMinutes: Math.round((prev.totalDistanceKm / (prev.currentSpeedKmh || 35)) * 60),
        currentPosition: {
          x: prev.pickupCoords.x,
          y: prev.pickupCoords.y,
          lat: prev.pickupCoords.lat,
          lng: prev.pickupCoords.lng,
        },
        checkpoints: prev.checkpoints.map((c) => ({ ...c, completed: false, timestamp: undefined })),
      }));
    }
  };

  // SVG route path coordinates (relative 0-100% coordinates for stylized Mysuru city vector grid)
  const routeWaypoints = [
    { x: mission.pickupCoords.x, y: mission.pickupCoords.y },
    { x: 30, y: 72 },
    { x: 42, y: 65 },
    { x: 50, y: 52 },
    { x: 62, y: 44 },
    { x: 74, y: 32 },
    { x: mission.dropCoords.x, y: mission.dropCoords.y },
  ];

  // Geolocation watcher reference
  const geoWatchRef = useRef<number | null>(null);

  // Sync internal state when prop changes
  useEffect(() => {
    setMission(initialMission);
  }, [initialMission]);

  useEffect(() => {
    setDriverMode(currentRole === 'volunteer');
  }, [currentRole]);

  // Haversine Distance Formula in Kilometers
  const calculateHaversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's mean radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  };

  // Simulation loop for live Swiggy-like vehicle movement
  useEffect(() => {
    if (!isPlaying || mission.status === 'delivered') return;

    const interval = setInterval(() => {
      setMission((prev) => {
        // If already near destination, finish or slow down
        if (prev.distanceRemainingKm <= 0.1) {
          const reachedMission: SupplyDeliveryMission = {
            ...prev,
            status: 'near_destination',
            distanceRemainingKm: 0.05,
            estimatedArrivalMinutes: 1,
            currentSpeedKmh: 8,
          };
          onUpdateMission?.(reachedMission);
          return reachedMission;
        }

        // Calculate progress along waypoints
        const step = 0.015 * simSpeed;
        const remainingKm = Math.max(0.05, +(prev.distanceRemainingKm - step * 0.4).toFixed(2));
        const progressRatio = 1 - remainingKm / prev.totalDistanceKm;

        // Interpolate along route waypoints
        const totalSegments = routeWaypoints.length - 1;
        const currentSegmentIndex = Math.min(
          totalSegments - 1,
          Math.floor(progressRatio * totalSegments)
        );
        const segmentT = progressRatio * totalSegments - currentSegmentIndex;

        const p0 = routeWaypoints[currentSegmentIndex];
        const p1 = routeWaypoints[Math.min(totalSegments, currentSegmentIndex + 1)];

        const newX = p0.x + (p1.x - p0.x) * segmentT;
        const newY = p0.y + (p1.y - p0.y) * segmentT;

        // Calculate heading in degrees
        const angleRad = Math.atan2(p1.y - p0.y, p1.x - p0.x);
        const angleDeg = (angleRad * 180) / Math.PI;

        // Simulated speed with natural variance based on configured speed
        const baseSpeed = remainingKm < 1 ? Math.min(16, configuredSpeed) : configuredSpeed;
        const speedNoise = Math.floor(Math.sin(Date.now() / 1500) * 4);
        const currentSpeedKmh = Math.max(10, baseSpeed + speedNoise);

        // Dynamic ETA in minutes
        const etaMinutes = Math.max(1, Math.round((remainingKm / (currentSpeedKmh || 30)) * 60));

        // Update checkpoints status
        const updatedCheckpoints = prev.checkpoints.map((chk, index) => {
          const checkpointRatio = (index + 1) / (prev.checkpoints.length + 1);
          if (progressRatio >= checkpointRatio && !chk.completed) {
            return {
              ...chk,
              completed: true,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            };
          }
          return chk;
        });

        // Determine status
        let newStatus: SupplyRunStatus = prev.status;
        if (remainingKm <= 0.8) {
          newStatus = 'near_destination';
        } else if (remainingKm < prev.totalDistanceKm) {
          newStatus = 'in_transit';
        }

        const updated: SupplyDeliveryMission = {
          ...prev,
          distanceRemainingKm: remainingKm,
          estimatedArrivalMinutes: etaMinutes,
          currentSpeedKmh,
          headingDeg: angleDeg,
          status: newStatus,
          currentPosition: {
            x: Math.min(95, Math.max(5, newX)),
            y: Math.min(95, Math.max(5, newY)),
            lat: +(prev.pickupCoords.lat + (prev.dropCoords.lat - prev.pickupCoords.lat) * progressRatio).toFixed(6),
            lng: +(prev.pickupCoords.lng + (prev.dropCoords.lng - prev.pickupCoords.lng) * progressRatio).toFixed(6),
          },
          checkpoints: updatedCheckpoints,
        };

        onUpdateMission?.(updated);
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, simSpeed, mission.status, mission.totalDistanceKm, onUpdateMission]);

  // Real Browser Device Geolocation Handler (Mysuru City Live Tracking Engine)
  const toggleDeviceGps = () => {
    if (deviceGpsActive) {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
      setDeviceGpsActive(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      setGpsError('HTML5 Geolocation is not supported by your browser environment.');
      return;
    }

    setGpsError(null);
    try {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setDeviceGpsActive(true);
          const { latitude, longitude, accuracy, speed, altitude, heading } = position.coords;
          const timeStr = new Date().toLocaleTimeString();
          setLastTelemetryTime(timeStr);

          // Save live device coordinates
          const coordsData = {
            lat: +latitude.toFixed(6),
            lng: +longitude.toFixed(6),
            accuracy: Math.round(accuracy),
            speed: speed !== null ? Math.round(speed * 3.6) : null,
            altitude: altitude !== null ? Math.round(altitude) : 765, // Mysuru elevation ~765m
            heading: heading !== null ? Math.round(heading) : null,
            timestamp: position.timestamp,
          };
          setDeviceCoords(coordsData);

          // Calculate real Haversine distance to destination in Kuvempunagar, Mysuru
          const realDistanceToDrop = calculateHaversineKm(
            latitude,
            longitude,
            mission.dropCoords.lat,
            mission.dropCoords.lng
          );

          // Record telemetry packet log
          const logEntry = `${timeStr} · GPS Fix: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (±${Math.round(accuracy)}m) · Speed: ${speed ? Math.round(speed * 3.6) : 0} km/h`;
          setLiveGpsLogs((prev) => [logEntry, ...prev.slice(0, 9)]);

          // Check if physical device is within Mysuru region (approx bounding box)
          const isPhysicallyInMysuru =
            latitude >= 12.18 && latitude <= 12.42 && longitude >= 76.52 && longitude <= 76.75;

          if (isPhysicallyInMysuru || gpsMode === 'raw_device') {
            // Direct real-world coordinate mapping
            // Map Mysuru bounding box into 0-100 SVG coordinates
            const minLat = 12.26;
            const maxLat = 12.35;
            const minLng = 76.58;
            const maxLng = 76.68;

            const mapX = Math.min(95, Math.max(5, ((longitude - minLng) / (maxLng - minLng)) * 100));
            const mapY = Math.min(95, Math.max(5, ((maxLat - latitude) / (maxLat - minLat)) * 100));

            const measuredSpeed = speed !== null ? Math.max(5, Math.round(speed * 3.6)) : 28;
            const computedEta = Math.max(1, Math.round((realDistanceToDrop / measuredSpeed) * 60));

            setMission((prev) => {
              const updated: SupplyDeliveryMission = {
                ...prev,
                distanceRemainingKm: realDistanceToDrop,
                estimatedArrivalMinutes: computedEta,
                currentSpeedKmh: measuredSpeed,
                headingDeg: heading !== null ? Math.round(heading) : prev.headingDeg,
                status: realDistanceToDrop <= 0.8 ? 'near_destination' : 'in_transit',
                currentPosition: {
                  x: mapX,
                  y: mapY,
                  lat: +latitude.toFixed(6),
                  lng: +longitude.toFixed(6),
                },
              };
              onUpdateMission?.(updated);
              return updated;
            });
          } else {
            // Mysuru projected mode: user is outside Mysuru or indoors testing
            // We use real device sensor movements to advance the volunteer smoothly down the Mysuru route
            if (!initialGpsRef.current) {
              initialGpsRef.current = { lat: latitude, lng: longitude };
            }

            // Real physical delta displacement
            const dLat = Math.abs(latitude - initialGpsRef.current.lat);
            const dLng = Math.abs(longitude - initialGpsRef.current.lng);
            const totalDisplacementKm = calculateHaversineKm(
              initialGpsRef.current.lat,
              initialGpsRef.current.lng,
              latitude,
              longitude
            );

            // Advance remaining distance by real displacement
            const effectiveRemaining = Math.max(
              0.1,
              +(mission.totalDistanceKm - (totalDisplacementKm * 5)).toFixed(2)
            );
            const ratio = 1 - effectiveRemaining / mission.totalDistanceKm;

            const totalSegments = routeWaypoints.length - 1;
            const segIdx = Math.min(totalSegments - 1, Math.floor(ratio * totalSegments));
            const segT = ratio * totalSegments - segIdx;
            const p0 = routeWaypoints[segIdx];
            const p1 = routeWaypoints[Math.min(totalSegments, segIdx + 1)];

            const projectedX = p0.x + (p1.x - p0.x) * segT;
            const projectedY = p0.y + (p1.y - p0.y) * segT;

            const currentSpeedKmh = speed !== null ? Math.round(speed * 3.6) : (effectiveRemaining < 1 ? 16 : 30);
            const eta = Math.max(1, Math.round((effectiveRemaining / currentSpeedKmh) * 60));

            setMission((prev) => {
              const updated: SupplyDeliveryMission = {
                ...prev,
                distanceRemainingKm: effectiveRemaining,
                estimatedArrivalMinutes: eta,
                currentSpeedKmh,
                status: effectiveRemaining <= 0.8 ? 'near_destination' : 'in_transit',
                currentPosition: {
                  x: Math.min(95, Math.max(5, projectedX)),
                  y: Math.min(95, Math.max(5, projectedY)),
                  lat: +(prev.pickupCoords.lat + (prev.dropCoords.lat - prev.pickupCoords.lat) * ratio).toFixed(6),
                  lng: +(prev.pickupCoords.lng + (prev.dropCoords.lng - prev.pickupCoords.lng) * ratio).toFixed(6),
                },
              };
              onUpdateMission?.(updated);
              return updated;
            });
          }
        },
        (error) => {
          console.warn('GPS Watch error:', error);
          let errMsg = 'Location permission was denied or GPS sensor is unavailable.';
          if (error.code === error.PERMISSION_DENIED) {
            errMsg = 'Location permission denied. Please allow browser location access in settings to broadcast live GPS.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errMsg = 'GPS position unavailable. Check your device location service.';
          } else if (error.code === error.TIMEOUT) {
            errMsg = 'GPS request timed out. Retrying live signal lock...';
          }
          setGpsError(errMsg);
          setDeviceGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      geoWatchRef.current = watchId;
    } catch {
      setGpsError('Could not initialize GPS transceiver.');
      setDeviceGpsActive(false);
    }
  };

  useEffect(() => {
    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
      }
    };
  }, []);

  // Handover OTP Submit
  const handleVerifyHandover = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin !== mission.deliveryPin) {
      setPinError(true);
      return;
    }

    const proof = {
      receivedByName: receiverName || mission.recipientName,
      signatureReceived: true,
      photoUrl: photoProof || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=60',
      deliveredAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      notes: deliveryNotes || 'Supplies inspected and received in pristine condition.',
    };

    const deliveredMission: SupplyDeliveryMission = {
      ...mission,
      status: 'delivered',
      estimatedArrivalMinutes: 0,
      distanceRemainingKm: 0,
      currentSpeedKmh: 0,
      proofOfDelivery: proof,
    };

    setMission(deliveredMission);
    setIsPlaying(false);
    setHandoverModalOpen(false);
    onUpdateMission?.(deliveredMission);
    onCompleteDelivery?.(mission.id, proof);
  };

  // Build SVG Path String for Route Polyline
  const pathD = `M ${routeWaypoints[0].x} ${routeWaypoints[0].y} ` +
    routeWaypoints.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ');

  const statusConfig = {
    assigned: {
      badge: 'bg-amber-100 text-amber-900 border-amber-300',
      label: 'Mission Assigned',
      desc: 'Volunteer assigned. Navigating to pickup hub.',
    },
    at_pickup: {
      badge: 'bg-blue-100 text-blue-900 border-blue-300',
      label: 'At Pickup Hub',
      desc: 'Loading supplies and verifying packaging integrity.',
    },
    in_transit: {
      badge: 'bg-emerald-500 text-white border-emerald-400 animate-pulse',
      label: 'Live Supply Run · In Transit',
      desc: 'En route to beneficiary sanctuary.',
    },
    near_destination: {
      badge: 'bg-orange-500 text-white border-orange-400 animate-pulse',
      label: 'Arriving at Receiving Gate',
      desc: 'Volunteer is within 800m of destination.',
    },
    delivered: {
      badge: 'bg-teal-900 text-emerald-300 border-teal-700',
      label: 'Delivered & Handover Confirmed',
      desc: 'Supplies received, verified, and signed for.',
    },
  }[mission.status];

  // Dynamic progress & telemetry calculations
  const progressRatio = Math.min(1, Math.max(0, 1 - (mission.distanceRemainingKm / (mission.totalDistanceKm || 1))));
  const progressCompletedPct = Math.round(progressRatio * 100);
  const progressRemainingPct = 100 - progressCompletedPct;
  const distanceCoveredKm = Math.max(0, +(mission.totalDistanceKm - mission.distanceRemainingKm).toFixed(1));

  return (
    <div className={`flex flex-col bg-stone-50 rounded-2xl overflow-hidden border border-stone-200/90 shadow-xl ${isModal ? 'max-h-[92vh]' : 'w-full'}`}>
      {/* Top Swiggy-style Active Mission Header */}
      <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 text-white p-4 sm:p-5 border-b border-emerald-800/40 relative overflow-hidden">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-10 w-96 h-40 bg-emerald-400/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/30 text-emerald-300 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>MYSURU LIVE SUPPLY CORPS</span>
              </span>
              <span className="text-xs text-stone-300 font-mono">
                REF: #{mission.trackingNumber}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-400/30 font-medium">
                {mission.priority}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white mt-1.5 flex items-center gap-2">
              <span>{mission.resourceTitle}</span>
            </h2>

            <p className="text-xs text-emerald-100/80 mt-0.5">
              Consignment: <strong>{mission.quantity}</strong> · Beneficiary Sanctuary:{' '}
              <strong className="text-white underline decoration-emerald-400 underline-offset-2">
                {mission.recipientName}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
            {/* Dispatch Resource Button */}
            <button
              onClick={() => setDispatchModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md"
              title="Dispatch Resource using Current Location or City"
            >
              <Package className="w-3.5 h-3.5 text-stone-950" />
              <span>Dispatch Resource</span>
            </button>

            {/* Workflow Demonstration Guide Button */}
            <button
              onClick={() => setDemoModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer bg-white/10 hover:bg-white/20 text-emerald-200 border border-white/20"
              title="See How Volunteer Dispatch & Delivery Works"
            >
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>How It Works</span>
            </button>

            {/* Fast 15s Demonstration Run */}
            <button
              onClick={handleRunFastDemo}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer bg-emerald-600/70 hover:bg-emerald-600 text-white border border-emerald-400/40"
              title="Fast Forward 15-second Delivery Simulation"
            >
              <FastForward className="w-3.5 h-3.5 text-amber-300" />
              <span>15s Demo</span>
            </button>

            {/* View As Volunteer / Observer Toggle */}
            <button
              onClick={() => setDriverMode(!driverMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                driverMode
                  ? 'bg-emerald-500 text-teal-950 border-emerald-300 shadow-md'
                  : 'bg-teal-900/80 text-emerald-300 border-teal-700 hover:bg-teal-800'
              }`}
              title="Toggle Volunteer Driver Cockpit"
            >
              <Radio className={`w-3.5 h-3.5 ${driverMode ? 'animate-pulse' : ''}`} />
              <span>{driverMode ? 'Driver Cockpit (Active)' : 'Observer Mode'}</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-teal-900/80 hover:bg-teal-800 text-stone-200 hover:text-white transition-all cursor-pointer"
                title="Close Tracker"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* VOLUNTEER DRIVER COCKPIT (Only when logged in or viewed as volunteer) */}
        {driverMode && (
          <div className="mt-4 pt-4 border-t border-emerald-500/30 bg-teal-900/50 backdrop-blur-md rounded-2xl p-3.5 border border-emerald-400/20 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
                  <LocateFixed className={`w-5 h-5 ${deviceGpsActive ? 'animate-spin text-emerald-400' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Volunteer Driver Telemetry Console
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                      KA-09-EV-4921 (Mysuru)
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-200/80">
                    {deviceGpsActive
                      ? '🟢 Real device GPS broadcasting live telemetry to Kuvempunagar receiving sanctuary.'
                      : '🔴 Live device location broadcasting is off. Turn on below to transmit your real GPS.'}
                  </p>
                </div>
              </div>

              {/* Main Broadcast Toggle */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleDeviceGps}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    deviceGpsActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-teal-950 font-extrabold'
                  }`}
                >
                  <Radio className="w-4 h-4" />
                  <span>{deviceGpsActive ? 'Stop Live GPS Broadcast' : '🔴 Broadcast My Live Device GPS (Mysuru)'}</span>
                </button>

                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="px-2.5 py-2 rounded-xl bg-teal-950 hover:bg-teal-900 text-emerald-300 text-xs font-mono border border-emerald-500/30 transition-all cursor-pointer"
                  title="View GPS Packets"
                >
                  Logs ({liveGpsLogs.length})
                </button>
              </div>
            </div>

            {/* Live Sensor Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-teal-950/80 p-2 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/70 uppercase tracking-wider block">Real GNSS Sensor</span>
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1 mt-0.5">
                  <Signal className={`w-3.5 h-3.5 ${deviceGpsActive ? 'text-emerald-400' : 'text-stone-400'}`} />
                  <span>{deviceGpsActive ? 'Live Sat-Lock' : 'Standby / Demo'}</span>
                </span>
                <span className="text-[10px] text-stone-400 font-mono block">
                  {deviceCoords ? `±${deviceCoords.accuracy}m accuracy` : 'Precision ±3.5m'}
                </span>
              </div>

              <div className="bg-teal-950/80 p-2 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/70 uppercase tracking-wider block">Mysuru Coords</span>
                <span className="text-xs font-mono font-bold text-emerald-300 truncate block mt-0.5">
                  {mission.currentPosition.lat}° N
                </span>
                <span className="text-[10px] text-emerald-400/80 font-mono">
                  {mission.currentPosition.lng}° E
                </span>
              </div>

              <div className="bg-teal-950/80 p-2 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/70 uppercase tracking-wider block">Remaining to Drop</span>
                <span className="text-sm font-bold text-white block mt-0.5">
                  {mission.distanceRemainingKm} km
                </span>
                <span className="text-[10px] text-amber-300 font-mono">
                  ETA: {mission.estimatedArrivalMinutes} Mins
                </span>
              </div>

              <div className="bg-teal-950/80 p-2 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-emerald-300/70 uppercase tracking-wider block">Driver Speed & Battery</span>
                <span className="text-sm font-bold text-amber-300 block mt-0.5">
                  {mission.currentSpeedKmh} km/h
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Ather EV: {mission.volunteer.batteryOrFuel}% charge
                </span>
              </div>
            </div>

            {/* Quick Driver Action Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-500/20 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-emerald-200">Demonstration Mode:</span>
                <button
                  onClick={() => setGpsMode(gpsMode === 'mysuru_projected' ? 'raw_device' : 'mysuru_projected')}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-emerald-200 text-[11px] font-semibold transition-all cursor-pointer border border-white/20"
                >
                  {gpsMode === 'mysuru_projected' ? '🎯 Mysuru Corridor Alignment' : '🌐 Raw Physical GNSS'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTrafficModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-medium border border-amber-400/30 transition-all cursor-pointer"
                >
                  ⚠️ Report Traffic / Delay
                </button>
                <button
                  onClick={() => setHandoverModalOpen(true)}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs"
                >
                  🔑 Enter Recipient OTP ({mission.deliveryPin})
                </button>
              </div>
            </div>

            {/* Live GPS Telemetry Stream Drawer */}
            {showLogs && (
              <div className="bg-teal-950 p-2.5 rounded-xl border border-emerald-500/30 text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between text-emerald-300 font-bold mb-1">
                  <span>📡 Live GNSS Telemetry Packets (Mysuru Engine)</span>
                  <button onClick={() => setShowLogs(false)} className="text-stone-400 hover:text-white">✕</button>
                </div>
                {liveGpsLogs.length > 0 ? (
                  liveGpsLogs.map((log, i) => (
                    <div key={i} className="text-stone-300 border-b border-teal-900/80 pb-0.5">
                      {log}
                    </div>
                  ))
                ) : (
                  <p className="text-stone-400">No packets recorded yet. Click "Broadcast My Live Device GPS" to begin receiving satellite fixes.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Observer Metrics Ribbon (Always visible) */}
        {!driverMode && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-emerald-800/40 text-xs">
            <div className="bg-teal-950/60 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-200/70 uppercase tracking-wider block">Estimated ETA</span>
              <div className="text-lg font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{mission.status === 'delivered' ? 'Completed' : `${mission.estimatedArrivalMinutes} Mins`}</span>
              </div>
            </div>

            <div className="bg-teal-950/60 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-200/70 uppercase tracking-wider block">Distance Remaining</span>
              <div className="text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
                <Navigation className="w-4 h-4 text-teal-400" />
                <span>{mission.status === 'delivered' ? '0.0 km' : `${mission.distanceRemainingKm} km`}</span>
              </div>
            </div>

            <div className="bg-teal-950/60 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-200/70 uppercase tracking-wider block">Live Speed</span>
              <div className="text-lg font-bold text-amber-300 flex items-center gap-1.5 mt-0.5">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>{mission.status === 'delivered' ? 'Stationary' : `${mission.currentSpeedKmh} km/h`}</span>
              </div>
            </div>

            <div className="bg-teal-950/60 backdrop-blur-md p-2.5 rounded-xl border border-emerald-500/20">
              <span className="text-[11px] text-emerald-200/70 uppercase tracking-wider block">Handover PIN (OTP)</span>
              <div className="text-lg font-mono font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5 tracking-widest">
                <span>{mission.deliveryPin}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Speed & Distance Controller with Live Remaining Distance and Time Remained */}
      <div className="bg-gradient-to-r from-teal-950 via-stone-900 to-emerald-950 p-4 border-b border-emerald-500/30 text-white space-y-3 shadow-inner">
        {/* Row 1: Key Metrics & Live Countdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold">
              <span>Distance to Delivery</span>
              <Navigation className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {mission.distanceRemainingKm} <span className="text-xs font-normal text-stone-300">km</span>
            </div>
            <div className="text-[10px] text-stone-300 mt-0.5">
              Total: {mission.totalDistanceKm} km · Covered: {distanceCoveredKm} km
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[11px] text-amber-300 font-semibold">
              <span>Time Remained (ETA)</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-1">
              {mission.status === 'delivered' ? 0 : mission.estimatedArrivalMinutes} <span className="text-xs font-normal text-amber-200">Mins</span>
            </div>
            <div className="text-[10px] text-stone-300 mt-0.5">
              Speed: {mission.currentSpeedKmh} km/h pace
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[11px] text-teal-300 font-semibold">
              <span>Progress Remaining</span>
              <Activity className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-xl font-bold font-mono text-teal-200 mt-1">
              {mission.status === 'delivered' ? 0 : progressRemainingPct}% <span className="text-xs font-normal text-stone-300">left</span>
            </div>
            <div className="text-[10px] text-stone-300 mt-0.5">
              {mission.status === 'delivered' ? 100 : progressCompletedPct}% route completed
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/10">
            <div className="flex items-center justify-between text-[11px] text-rose-300 font-semibold">
              <span>Volunteer Speed</span>
              <Gauge className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {mission.currentSpeedKmh} <span className="text-xs font-normal text-stone-300">km/h</span>
            </div>
            <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
              Mysuru Relief Corridor
            </div>
          </div>
        </div>

        {/* Row 2: Visual Animated Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-stone-300 font-mono">
            <span>🟢 {mission.pickupLocation.slice(0, 24)}</span>
            <span className="text-emerald-400 font-bold">
              {progressCompletedPct}% Covered · {mission.distanceRemainingKm} km remaining to destination
            </span>
            <span>🏁 {mission.recipientName.slice(0, 24)}</span>
          </div>
          <div className="w-full bg-white/15 h-3 rounded-full overflow-hidden p-0.5 border border-white/20 relative">
            <div
              className="h-full bg-gradient-to-r from-teal-400 via-emerald-400 to-green-300 rounded-full transition-all duration-700 relative flex items-center justify-end"
              style={{ width: `${Math.max(5, Math.min(100, progressCompletedPct))}%` }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-white shadow-md animate-ping" />
            </div>
          </div>
        </div>

        {/* Row 3: Interactive Speed & Distance Selection Controls */}
        <div className="bg-black/35 p-3.5 rounded-xl border border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Speed Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-stone-300 font-semibold flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>Adjust Volunteer Speed:</span>
              </label>
              <span className="font-mono font-bold text-amber-300 text-sm">{configuredSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'City (25 km/h)', val: 25 },
                { label: 'Corridor (40 km/h)', val: 40 },
                { label: 'Ring Road (60 km/h)', val: 60 },
                { label: 'Express (80 km/h)', val: 80 },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => handleSelectSpeed(s.val)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                    configuredSpeed === s.val
                      ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-xs'
                      : 'bg-white/10 text-stone-300 border-white/10 hover:bg-white/20'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={configuredSpeed}
              onChange={(e) => handleSelectSpeed(parseInt(e.target.value, 10))}
              className="w-full accent-amber-400 h-1.5 bg-white/20 rounded cursor-pointer"
            />
            <p className="text-[10px] text-stone-400">
              Dragging changes vehicle velocity & instantly recalculates remaining ETA to destination.
            </p>
          </div>

          {/* Distance Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-stone-300 font-semibold flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                <span>Adjust Delivery Route Distance:</span>
              </label>
              <span className="font-mono font-bold text-emerald-300 text-sm">{configuredDistance} km</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { label: 'Local (3.5 km)', val: 3.5 },
                { label: 'Corridor (8.2 km)', val: 8.2 },
                { label: 'City (14.5 km)', val: 14.5 },
                { label: 'Regional (28 km)', val: 28 },
              ].map((d) => (
                <button
                  key={d.val}
                  type="button"
                  onClick={() => handleSelectDistance(d.val)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                    configuredDistance === d.val
                      ? 'bg-emerald-500 text-teal-950 border-emerald-300 shadow-xs'
                      : 'bg-white/10 text-stone-300 border-white/10 hover:bg-white/20'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="1"
              max="35"
              step="0.5"
              value={configuredDistance}
              onChange={(e) => handleSelectDistance(parseFloat(e.target.value))}
              className="w-full accent-emerald-400 h-1.5 bg-white/20 rounded cursor-pointer"
            />
            <p className="text-[10px] text-stone-400">
              Modifies total mission distance and dynamically scales remaining kilometers.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Vector Map on Left/Top + Telemetry & Controls on Right/Bottom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
        {/* Left Section: Swiggy Interactive Vector Schematic Map Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-stone-100 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200 relative min-h-[380px] sm:min-h-[460px]">
          {/* Map Toolbar Controls Overlay */}
          <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
            {/* Live Status Chip */}
            <div className="pointer-events-auto shadow-md rounded-xl bg-white/95 backdrop-blur-md px-3 py-1.5 border border-stone-200 flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${mission.status === 'delivered' ? 'bg-emerald-500' : 'bg-emerald-500 animate-ping'}`} />
              <span className="text-xs font-bold text-stone-800">
                {statusConfig.label} · Mysuru
              </span>
            </div>

            {/* Map Theme & Zoom Controls */}
            <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl border border-stone-200 shadow-md">
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, +(z + 0.1).toFixed(1)))}
                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.8, +(z - 0.1).toFixed(1)))}
                className="p-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoomLevel(1);
                }}
                className="p-1.5 text-stone-600 hover:text-teal-900 hover:bg-teal-50 rounded-lg transition-all"
                title="Recenter Route"
              >
                <Crosshair className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setMapTheme((t) => (t === 'schematic' ? 'dark' : t === 'dark' ? 'satellite' : 'schematic'));
                }}
                className="px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-all border-l border-stone-200 flex items-center gap-1"
                title="Toggle Map Style"
              >
                <Layers className="w-3.5 h-3.5 text-teal-800" />
                <span className="capitalize">{mapTheme}</span>
              </button>
            </div>
          </div>

          {/* Interactive Vector Route Visualizer (High-Fidelity SVG of Mysuru City Schematic) */}
          <div className="w-full flex-1 relative overflow-hidden flex items-center justify-center p-2 select-none">
            <svg
              viewBox="0 0 100 100"
              className={`w-full h-full transition-transform duration-300 ${
                mapTheme === 'dark'
                  ? 'bg-[#121820]'
                  : mapTheme === 'satellite'
                  ? 'bg-[#1b262c]'
                  : 'bg-[#EFF3EE]'
              }`}
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <defs>
                {/* Route gradient glow */}
                <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="50%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>

                {/* Pulse radar wave filter */}
                <radialGradient id="radarPulse" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#10B981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Urban schematic layout: Mysuru Landmarks */}
              {/* Kukkarahalli Lake Nature Park (West-Central Mysuru) */}
              <rect x="6" y="8" width="24" height="20" rx="3" fill={mapTheme === 'dark' ? '#16221c' : '#D1FAE5'} opacity="0.8" />
              <text x="18" y="19" fontSize="2.2" fill={mapTheme === 'dark' ? '#34d399' : '#047857'} textAnchor="middle" fontWeight="bold">
                Kukkarahalli Lake Sanctuary
              </text>

              {/* Mysore Palace & Royal Grounds (Central Mysuru) */}
              <rect x="42" y="24" width="22" height="18" rx="2" fill={mapTheme === 'dark' ? '#262215' : '#FEF3C7'} opacity="0.85" stroke="#F59E0B" strokeWidth="0.4" />
              <text x="53" y="34" fontSize="2.2" fill={mapTheme === 'dark' ? '#FBBF24' : '#B45309'} textAnchor="middle" fontWeight="bold">
                👑 Mysore Palace
              </text>

              {/* Chamundi Hill & Temple Foothills (South-East Mysuru) */}
              <rect x="68" y="60" width="28" height="26" rx="4" fill={mapTheme === 'dark' ? '#1f241a' : '#DCFCE7'} opacity="0.75" />
              <text x="82" y="74" fontSize="2.2" fill={mapTheme === 'dark' ? '#34d399' : '#15803d'} textAnchor="middle" fontWeight="bold">
                Chamundi Hill Foothills
              </text>

              {/* Ballal Circle / Chamarajapuram (Mid Route) */}
              <rect x="42" y="58" width="18" height="12" rx="2" fill={mapTheme === 'dark' ? '#1b2229' : '#E2E8F0'} opacity="0.6" />
              <text x="51" y="65" fontSize="1.8" fill={mapTheme === 'dark' ? '#94A3B8' : '#475569'} textAnchor="middle" fontWeight="bold">
                Ballal Circle
              </text>

              {/* Urban Grid Road Network of Mysuru */}
              <path d="M 0 25 L 100 25" stroke={mapTheme === 'dark' ? '#1F2937' : '#E2E8F0'} strokeWidth="1.8" />
              <path d="M 0 50 L 100 50" stroke={mapTheme === 'dark' ? '#1F2937' : '#E2E8F0'} strokeWidth="1.8" />
              <path d="M 0 75 L 100 75" stroke={mapTheme === 'dark' ? '#1F2937' : '#E2E8F0'} strokeWidth="1.8" />
              <path d="M 25 0 L 25 100" stroke={mapTheme === 'dark' ? '#1F2937' : '#E2E8F0'} strokeWidth="1.8" />
              <path d="M 50 0 L 50 100" stroke={mapTheme === 'dark' ? '#1F2937' : '#E2E8F0'} strokeWidth="1.8" />
              <path d="M 75 0 L 75 100" stroke={mapTheme === 'dark' ? '#1F2937' : '#E2E8F0'} strokeWidth="1.8" />

              {/* Primary Arterial Expressways of Mysuru */}
              {/* Outer Ring Road (ORR) */}
              <path
                d="M 5 95 Q 50 85 95 90"
                stroke={mapTheme === 'dark' ? '#334155' : '#CBD5E1'}
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* JLB Road / Nanjangud Highway Corridor */}
              <path
                d="M 15 90 L 85 15"
                stroke={mapTheme === 'dark' ? '#334155' : '#CBD5E1'}
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Real Mysuru Street Names */}
              <text x="32" y="88" fontSize="1.8" fill={mapTheme === 'dark' ? '#64748B' : '#94A3B8'} fontWeight="bold">
                NH 766 (Nanjangud-Ooty Road)
              </text>
              <text x="62" y="42" fontSize="1.8" fill={mapTheme === 'dark' ? '#64748B' : '#94A3B8'} fontWeight="bold">
                JLB Road Expressway
              </text>

              {/* ACTIVE ROUTE POLYLINE (GLOWING SWIGGY HIGHWAY) */}
              {/* Outer Glow Halo */}
              <path
                d={pathD}
                fill="none"
                stroke="#10B981"
                strokeWidth="6"
                strokeOpacity="0.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Solid Base Route */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Animated Dashed Pulse on Route */}
              <path
                d={pathD}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                strokeDasharray="2, 4"
                strokeLinecap="round"
                className="animate-pulse"
              />

              {/* Checkpoint Nodes along route */}
              {routeWaypoints.slice(1, -1).map((chk, i) => (
                <g key={`chk-${i}`} transform={`translate(${chk.x}, ${chk.y})`}>
                  <circle r="2" fill="#FFFFFF" stroke="#059669" strokeWidth="1" />
                  <circle r="0.9" fill="#059669" />
                </g>
              ))}

              {/* PICKUP PIN (APMC Bandipalya Depot, Mysuru) */}
              <g transform={`translate(${mission.pickupCoords.x}, ${mission.pickupCoords.y})`}>
                <circle r="4" fill="#10B981" fillOpacity="0.2" className="animate-ping" />
                <circle r="3.2" fill="#047857" stroke="#FFFFFF" strokeWidth="1.2" />
                <rect x="-1.5" y="-1.5" width="3" height="3" fill="#FFFFFF" rx="0.5" />
                <rect x="-22" y="-9" width="44" height="5.5" rx="1.5" fill="#064E3B" />
                <text x="0" y="-5.4" fontSize="2.2" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
                  🟢 PICKUP: {mission.pickupLocation.slice(0, 22)}
                </text>
              </g>

              {/* DESTINATION PIN (Karuna Vridhashram, Kuvempunagar, Mysuru) */}
              <g transform={`translate(${mission.dropCoords.x}, ${mission.dropCoords.y})`}>
                <circle r="4.5" fill="#DC2626" fillOpacity="0.2" className="animate-ping" />
                <circle r="3.4" fill="#DC2626" stroke="#FFFFFF" strokeWidth="1.2" />
                <polygon points="0,-1.8 1.8,-0.5 0,0.8" fill="#FFFFFF" />
                <rect x="-24" y="-9.5" width="48" height="5.5" rx="1.5" fill="#7F1D1D" />
                <text x="0" y="-5.9" fontSize="2.2" fill="#FFFFFF" textAnchor="middle" fontWeight="bold">
                  🏁 DROP: {mission.recipientName.slice(0, 24)}
                </text>
              </g>

              {/* LIVE VOLUNTEER VEHICLE MARKER (Swiggy Moving Mascot) */}
              <g
                transform={`translate(${mission.currentPosition.x}, ${mission.currentPosition.y})`}
                className="transition-all duration-700 ease-out"
              >
                {/* Sonar Radar Waves (Expanding circles) */}
                <circle r="8" fill="url(#radarPulse)" className="animate-ping opacity-75" />
                <circle r="5" fill="#10B981" fillOpacity="0.3" />

                {/* Outer halo badge */}
                <circle r="3.5" fill="#047857" stroke="#FFFFFF" strokeWidth="1.2" />

                {/* Direction Heading Pointer */}
                <polygon
                  points="0,-4.5 1.8,-2 -1.8,-2"
                  fill="#F59E0B"
                  transform={`rotate(${mission.headingDeg})`}
                />

                {/* Scooter / Vehicle Icon */}
                <circle r="2.2" fill="#F8FAFC" />
                <circle r="1" fill="#065F46" />

                {/* Volunteer Floating Nameplate */}
                <rect x="-22" y="4.5" width="44" height="6.5" rx="2" fill="#0F172A" fillOpacity="0.94" />
                <text x="0" y="8.8" fontSize="2.2" fill="#34D399" textAnchor="middle" fontWeight="bold">
                  🛵 {mission.volunteer.name.split(' ')[0]} (KA-09) · {mission.status === 'delivered' ? 'Arrived' : `${mission.currentSpeedKmh} km/h`}
                </text>
              </g>
            </svg>
          </div>

          {/* Bottom GPS Telemetry & Satellite Status Ticker */}
          <div className="bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-2.5 flex items-center justify-between text-xs text-stone-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-[11px] text-stone-700">
                <Compass className="w-3.5 h-3.5 text-teal-800" />
                <span>Mysuru GPS: {mission.currentPosition.lat}° N, {mission.currentPosition.lng}° E</span>
              </span>

              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>{deviceGpsActive ? 'GNSS Device Lock' : 'Simulated Telemetry Lock'}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[11px] text-stone-500">
                <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                <span>EV: {mission.volunteer.batteryOrFuel}%</span>
              </span>

              {/* Real Device GPS button */}
              <button
                onClick={toggleDeviceGps}
                className={`text-[11px] px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  deviceGpsActive
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-300'
                }`}
                title="Toggle Live Device GPS Tracking"
              >
                <Compass className={`w-3.5 h-3.5 ${deviceGpsActive ? 'animate-spin' : ''}`} />
                <span>{deviceGpsActive ? 'Device GPS Active' : 'Broadcast Device GPS'}</span>
              </button>
            </div>
          </div>

          {gpsError && (
            <div className="bg-amber-50 border-t border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{gpsError}</span>
              </span>
              <button onClick={() => setGpsError(null)} className="text-amber-900 font-bold ml-2">
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Swiggy Delivery Partner Details, Checkpoints & Actions (5 cols) */}
        <div className="lg:col-span-5 bg-white p-5 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Swiggy Delivery Hero Partner Card */}
            <div className="bg-gradient-to-br from-stone-50 to-teal-50/40 rounded-2xl p-4 border border-teal-100/80 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={
                        mission.volunteer.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                      }
                      alt={mission.volunteer.name}
                      className="w-13 h-13 rounded-2xl object-cover border-2 border-emerald-500 shadow-xs"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 border border-white">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-stone-900 text-sm">{mission.volunteer.name}</h4>
                      <span className="text-[11px] bg-emerald-100 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
                        ★ {mission.volunteer.rating}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 mt-0.5">
                      {mission.volunteer.vehicleType} ·{' '}
                      <span className="font-mono font-semibold text-stone-700">
                        {mission.volunteer.vehicleNumber}
                      </span>
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-teal-800 font-medium">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>{mission.volunteer.deliveriesCount} Successful Relief Missions</span>
                    </div>
                  </div>
                </div>

                {/* Quick Call & Message Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCallModalOpen(true)}
                    className="p-2.5 rounded-xl bg-teal-900 text-white hover:bg-teal-800 transition-all cursor-pointer shadow-xs"
                    title="Call Volunteer"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setMsgModalOpen(true)}
                    className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 hover:bg-emerald-200 transition-all cursor-pointer border border-emerald-200"
                    title="Send Message"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Simulation Controls Strip */}
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={mission.status === 'delivered'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isPlaying
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Supply Run</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>{mission.status === 'delivered' ? 'Delivered' : 'Start / Resume Live Run'}</span>
                    </>
                  )}
                </button>

                <div className="inline-flex rounded-lg border border-stone-200 bg-white p-0.5 text-xs">
                  {[1, 2, 5].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setSimSpeed(speed)}
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        simSpeed === speed
                          ? 'bg-teal-900 text-white'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setShareToast(true);
                  setTimeout(() => setShareToast(false), 3000);
                }}
                className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200 rounded-lg transition-all"
                title="Share Live Tracking Link"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {shareToast && (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-2 rounded-lg text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Live Tracking link for #{mission.trackingNumber} copied to clipboard!</span>
              </div>
            )}

            {/* Checkpoint Milestones Stepper */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center justify-between">
                <span>Route Checkpoints & Milestones</span>
                <span className="text-[11px] text-stone-500 font-normal">
                  {mission.checkpoints.filter((c) => c.completed).length} of {mission.checkpoints.length} passed
                </span>
              </h4>

              <div className="space-y-2 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {mission.checkpoints.map((chk, i) => (
                  <div key={chk.id} className="relative flex items-start gap-2.5 text-xs">
                    <div
                      className={`absolute -left-5 top-0.5 w-4 h-4 rounded-full flex items-center justify-center border ${
                        chk.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-stone-300 text-stone-400'
                      }`}
                    >
                      {chk.completed ? (
                        <Check className="w-2.5 h-2.5" />
                      ) : (
                        <span className="text-[9px] font-bold">{i + 1}</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`font-semibold ${chk.completed ? 'text-stone-900' : 'text-stone-500'}`}>
                          {chk.name}
                        </span>
                        {chk.timestamp && (
                          <span className="text-[10px] text-stone-400 font-mono">{chk.timestamp}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500">{chk.locality}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pickup & Drop Addresses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100 text-xs">
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex items-center gap-1.5 text-emerald-800 font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Pickup Depot</span>
                </div>
                <p className="font-bold text-stone-900 text-xs">{mission.donorName}</p>
                <p className="text-stone-600 text-[11px] mt-0.5 line-clamp-2">{mission.pickupAddress}</p>
                <p className="text-stone-500 text-[11px] mt-1 font-mono">{mission.pickupPhone}</p>
              </div>

              <div className="bg-stone-50 p-3 rounded-xl border border-stone-200">
                <div className="flex items-center gap-1.5 text-teal-900 font-semibold mb-1">
                  <MapPin className="w-3.5 h-3.5 text-red-600" />
                  <span>Receiving Sanctuary</span>
                </div>
                <p className="font-bold text-stone-900 text-xs">{mission.recipientName}</p>
                <p className="text-stone-600 text-[11px] mt-0.5 line-clamp-2">{mission.dropAddress}</p>
                <p className="text-stone-500 text-[11px] mt-1 font-mono">{mission.recipientPhone}</p>
              </div>
            </div>
          </div>

          {/* Handover Verification CTA / Delivered Proof Card */}
          <div className="pt-3 border-t border-stone-200">
            {mission.status === 'delivered' ? (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Handover Verified & Completed</span>
                </div>
                <p className="text-stone-600">
                  Received by <strong>{mission.proofOfDelivery?.receivedByName}</strong> at{' '}
                  <span className="font-mono">{mission.proofOfDelivery?.deliveredAt}</span>.
                </p>
                {mission.proofOfDelivery?.notes && (
                  <p className="text-stone-500 italic bg-white p-2 rounded-lg border border-emerald-100">
                    "{mission.proofOfDelivery.notes}"
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/80 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="font-bold text-amber-950 text-xs">Arrived at Destination?</h5>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Verify the 4-digit Handover PIN with the recipient NGO coordinator to complete delivery.
                    </p>
                  </div>
                  <div className="bg-amber-200/60 px-2 py-1 rounded text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-900 block">PIN</span>
                    <span className="font-mono font-bold text-amber-950 text-sm tracking-wider">
                      {mission.deliveryPin}
                    </span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="md"
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 shadow-md flex items-center justify-center gap-2"
                  onClick={() => setHandoverModalOpen(true)}
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Verify Handover & Complete Delivery</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Direct Quick Call Simulator */}
      <Modal
        isOpen={callModalOpen}
        onClose={() => setCallModalOpen(false)}
        title={`Calling Volunteer Champion`}
        maxWidth="max-w-sm"
      >
        <div className="text-center py-4 space-y-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center animate-pulse">
            <Phone className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-lg font-bold text-stone-900">{mission.volunteer.name}</h4>
            <p className="text-xs text-stone-500 font-mono mt-0.5">{mission.volunteer.phone}</p>
            <p className="text-xs text-emerald-700 font-semibold mt-1">Connecting GiveConnect Secure Relay...</p>
          </div>

          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-left text-xs space-y-1">
            <p className="text-stone-700 font-medium">Safe Calling Protocol:</p>
            <p className="text-stone-500 text-[11px]">
              • Calls are routed through masked numbers for safety.
              <br />• If volunteer is driving, call may prompt hands-free audio.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCallModalOpen(false)}
            >
              Cancel Call
            </Button>
            <a
              href={`tel:${mission.volunteer.phone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs hover:bg-emerald-800 transition-all shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Open Phone Dialer</span>
            </a>
          </div>
        </div>
      </Modal>

      {/* MODAL: Quick Preset Messenger */}
      <Modal
        isOpen={msgModalOpen}
        onClose={() => setMsgModalOpen(false)}
        title={`Message to ${mission.volunteer.name}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-stone-600">
            Send quick real-time operational updates to volunteer's navigation console:
          </p>

          <div className="space-y-2">
            {[
              'I am waiting at Gate 2 entrance with a trolley.',
              'Supplies are ready and verified. Please proceed to the ramp.',
              'Please call when you reach the main road junction.',
              'Receiving coordinator is on standby at the front storeroom.',
            ].map((msg, i) => (
              <button
                key={i}
                onClick={() => {
                  setQuickMsgSent(msg);
                  setTimeout(() => {
                    setQuickMsgSent(null);
                    setMsgModalOpen(false);
                  }, 1500);
                }}
                className="w-full text-left p-3 rounded-xl border border-stone-200 hover:border-teal-500 hover:bg-teal-50/50 text-xs text-stone-800 transition-all flex items-center justify-between group cursor-pointer"
              >
                <span>"{msg}"</span>
                <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-teal-800 transition-colors" />
              </button>
            ))}
          </div>

          {quickMsgSent && (
            <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-xl border border-emerald-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Dispatched to Volunteer Console: "{quickMsgSent}"</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setMsgModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Handover Verification & OTP (Swiggy PIN Delivery Confirmation) */}
      <Modal
        isOpen={handoverModalOpen}
        onClose={() => setHandoverModalOpen(false)}
        title="Verify Handover & Complete Delivery"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleVerifyHandover} className="space-y-4 py-2">
          <NoticeBanner
            type="info"
            title="4-Digit Secure Delivery Handover"
            message={`The recipient representative at ${mission.recipientName} must provide the 4-digit PIN (${mission.deliveryPin}) to confirm physical receipt.`}
          />

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Enter 4-Digit Handover PIN *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                maxLength={4}
                required
                value={enteredPin}
                onChange={(e) => {
                  setEnteredPin(e.target.value.replace(/\D/g, ''));
                  setPinError(false);
                }}
                placeholder="e.g. 5829"
                className={`w-40 px-3 py-2 text-center font-mono text-xl tracking-widest border rounded-xl focus:outline-none focus:ring-2 ${
                  pinError
                    ? 'border-red-500 focus:ring-red-400 bg-red-50'
                    : 'border-stone-300 focus:ring-teal-700/20 focus:border-teal-700'
                }`}
              />
              <span className="text-xs text-stone-500">
                (Recipient PIN: <strong className="font-mono text-teal-900">{mission.deliveryPin}</strong>)
              </span>
            </div>
            {pinError && (
              <p className="text-xs text-red-600 mt-1">
                Invalid PIN. Please enter the correct 4-digit code provided to the recipient.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Received By (Name & Designation) *
            </label>
            <input
              type="text"
              required
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="e.g. Sister Mary / Coordinator Suresh"
              className="w-full px-3 py-2 text-sm border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Delivery Notes / Inspection Remarks
            </label>
            <textarea
              rows={2}
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="All items received sealed and undamaged. Stored in sanctuary pantry."
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          {/* Digital Signature & Proof of Delivery Simulation */}
          <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={signatureDone}
                onChange={(e) => setSignatureDone(e.target.checked)}
                className="rounded text-teal-900 focus:ring-teal-700 w-4 h-4"
              />
              <span className="text-xs text-stone-700 font-medium">
                Recipient digital signature verified & physical packages counter-checked.
              </span>
            </label>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-stone-500">Attach Delivery Proof Photo</span>
              <button
                type="button"
                onClick={() =>
                  setPhotoProof(
                    'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=600&auto=format&fit=crop&q=60'
                  )
                }
                className="text-[11px] text-teal-800 font-semibold hover:underline flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{photoProof ? 'Photo Captured ✓' : 'Simulate Camera Snap'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setHandoverModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-4"
            >
              Verify & Complete Handover
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Report Mysuru Route Obstacle / Delay */}
      <Modal
        isOpen={trafficModalOpen}
        onClose={() => setTrafficModalOpen(false)}
        title="Report Mysuru Route Obstacle / Delay"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-stone-600">
            Alert dispatchers and the recipient sanctuary about road conditions or barricades along the Mysuru corridor:
          </p>

          <div className="space-y-2">
            {[
              'Slow vehicle queue at Gun House Circle / Mysore Palace corridor (+5 mins)',
              'Road resurfacing near Ballal Circle; taking Saraswathipuram 1st Main bypass',
              'Smooth movement along Nanjangud Highway (NH 766); on schedule',
              'Kuvempunagar 8th Cross entry clear; arriving in 3 minutes',
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTrafficReported(preset);
                  setTrafficNote(preset);
                  setTimeout(() => {
                    setTrafficModalOpen(false);
                    setTrafficReported(null);
                  }, 1500);
                }}
                className="w-full text-left p-3 rounded-xl border border-stone-200 hover:border-amber-400 hover:bg-amber-50/40 text-xs text-stone-800 transition-all flex items-center justify-between cursor-pointer"
              >
                <span>{preset}</span>
                <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
              </button>
            ))}
          </div>

          {trafficReported && (
            <div className="bg-amber-50 text-amber-900 p-2.5 rounded-xl border border-amber-200 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-amber-600" />
              <span>Broadcast to dispatch network: "{trafficReported}"</span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setTrafficModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: Dispatch Resource using Current Location / City */}
      <Modal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
        title="Dispatch Resource from Current Location / City"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 py-2 text-xs">
          <NoticeBanner
            type="info"
            title="Volunteer Resource Dispatch"
            message="Configure origin dispatch hub or broadcast from your current physical device GPS location. Calibrate speed and distance to compute estimated delivery time."
          />

          {/* Select Resource */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Select Resource Consignment to Dispatch *
            </label>
            <select
              value={dispatchForm.title}
              onChange={(e) => {
                const val = e.target.value;
                let cat = 'Food Rations';
                let qty = '50 bags (10kg each)';
                if (val.includes('Antibiotics')) {
                  cat = 'Medicines';
                  qty = '120 sealed boxes';
                } else if (val.includes('Hygiene')) {
                  cat = 'Hygiene & Sanitation';
                  qty = '150 family kits';
                } else if (val.includes('Blankets')) {
                  cat = 'Clothes & Blankets';
                  qty = '80 blankets';
                }
                setDispatchForm((prev) => ({
                  ...prev,
                  title: val,
                  category: cat,
                  quantity: qty,
                }));
              }}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            >
              <option value="50 Bags Fortified Wheat Flour (Aata)">50 Bags Fortified Wheat Flour (Aata) - 500kg Rations</option>
              <option value="Pediatric Antibiotics & Cold-Pack Medicines">Pediatric Antibiotics & Multivitamin Drops (120 boxes)</option>
              <option value="150 Family Hygiene & Sanitation Kits">Essential Hygiene & Sanitation Kits (150 Family Packs)</option>
              <option value="Winter Woolen Blankets & Care Packages">Winter Woolen Blankets & Thermal Care Packs (80 units)</option>
              <option value="Infant Nutrition & Supplementary Formula">Infant Formula & Baby Feeding Kits (100 boxes)</option>
            </select>
          </div>

          {/* Origin Location & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Volunteer Current City *
              </label>
              <select
                value={dispatchForm.originCity}
                onChange={(e) =>
                  setDispatchForm((prev) => ({
                    ...prev,
                    originCity: e.target.value,
                    originLocation: e.target.value === 'Mysuru'
                      ? 'APMC Market Yard, Bandipalya, Mysuru'
                      : 'Koramangala Relief Depot, Bengaluru',
                  }))
                }
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white font-medium"
              >
                <option value="Mysuru">Mysuru (Active Demonstration Corridor)</option>
                <option value="Bengaluru">Bengaluru Central</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-stone-800">
                  Starting Location / Hub *
                </label>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="text-[11px] text-teal-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LocateFixed className="w-3 h-3 text-emerald-600" />
                  <span>Use Device GPS</span>
                </button>
              </div>
              <input
                type="text"
                value={dispatchForm.originLocation}
                onChange={(e) => setDispatchForm((prev) => ({ ...prev, originLocation: e.target.value }))}
                placeholder="e.g. Bandipalya APMC, Mysuru"
                className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl"
              />
            </div>
          </div>

          {/* Destination Sanctuary / Ashram */}
          <div>
            <label className="block text-xs font-semibold text-stone-800 mb-1">
              Destination Ashram / Beneficiary Sanctuary *
            </label>
            <select
              value={dispatchForm.recipientName}
              onChange={(e) => {
                const name = e.target.value;
                let addr = 'Plot 42, Magadi Road, Rajajinagar, Mysuru corridor';
                let phone = '+91 98450 22334';
                if (name.includes('Sneha')) {
                  addr = 'Survey 14, Bannerghatta Main Road';
                  phone = '+91 99001 77332';
                } else if (name.includes('Anandadhama')) {
                  addr = 'Near Chamundi Foothills, Lalitha Mahal Road, Mysuru';
                  phone = '+91 821 254 3911';
                }
                setDispatchForm((prev) => ({
                  ...prev,
                  recipientName: name,
                  dropAddress: addr,
                  recipientPhone: phone,
                }));
              }}
              className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl bg-white font-medium"
            >
              <option value="Karuna Vridhashram & Child Haven">Karuna Vridhashram & Child Haven (Mysuru/Bengaluru)</option>
              <option value="Sneha Sanjeevani Eldercare Sanctuary">Sneha Sanjeevani Eldercare Sanctuary</option>
              <option value="Mysuru Anandadhama Senior Citizen Sanctuary">Mysuru Anandadhama Senior Citizen Sanctuary (Chamundi Foothills)</option>
            </select>
          </div>

          {/* Speed & Distance Calibration */}
          <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5 text-amber-600" />
                <span>Speed & Distance Calibration</span>
              </span>
              <span className="text-[11px] font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                ETA Remained: ~{Math.max(1, Math.round((dispatchForm.totalDistanceKm / dispatchForm.speedKmh) * 60))} Mins
              </span>
            </div>

            {/* Speed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-600">Volunteer Speed: <strong>{dispatchForm.speedKmh} km/h</strong></span>
                <div className="flex items-center gap-1">
                  {[25, 40, 60, 80].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setDispatchForm((p) => ({ ...p, speedKmh: spd }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        dispatchForm.speedKmh === spd ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {spd}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={dispatchForm.speedKmh}
                onChange={(e) => setDispatchForm((p) => ({ ...p, speedKmh: parseInt(e.target.value, 10) }))}
                className="w-full accent-amber-500 h-1.5 bg-stone-300 rounded cursor-pointer"
              />
            </div>

            {/* Distance */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-600">Distance to Delivery Location: <strong>{dispatchForm.totalDistanceKm} km</strong></span>
                <div className="flex items-center gap-1">
                  {[3.5, 8.2, 14.5, 28].map((dst) => (
                    <button
                      key={dst}
                      type="button"
                      onClick={() => setDispatchForm((p) => ({ ...p, totalDistanceKm: dst }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        dispatchForm.totalDistanceKm === dst ? 'bg-emerald-700 text-white' : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {dst}km
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="35"
                step="0.5"
                value={dispatchForm.totalDistanceKm}
                onChange={(e) => setDispatchForm((p) => ({ ...p, totalDistanceKm: parseFloat(e.target.value) }))}
                className="w-full accent-emerald-600 h-1.5 bg-stone-300 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
            <Button variant="outline" size="sm" onClick={() => setDispatchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDispatch}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1.5 px-4"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm & Dispatch Resource Now</span>
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL: How Volunteer Dispatch and Delivery Works (Demonstration Guide) */}
      <Modal
        isOpen={demoModalOpen}
        onClose={() => setDemoModalOpen(false)}
        title="Volunteer Dispatch & Delivery Process (Demonstration)"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 py-2 text-xs">
          <NoticeBanner
            type="info"
            title="Swiggy-Style Relief Logistics Engine"
            message="Watch how volunteer supply redistribution operates from dispatch to recipient OTP delivery verification in Mysuru."
          />

          <div className="space-y-3">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-900 text-white font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <h4 className="font-bold text-stone-900">Resource & Location Dispatch</h4>
                <p className="text-stone-600 mt-0.5">
                  Volunteer initiates a supply run from their current location (e.g., Mysuru APMC Depot or real device GPS coordinates).
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-900 text-white font-bold flex items-center justify-center shrink-0">2</span>
              <div>
                <h4 className="font-bold text-stone-900">Speed, Distance & Live Time Remained</h4>
                <p className="text-stone-600 mt-0.5">
                  Selecting speed (e.g., 40 km/h) and route distance (e.g., 14.5 km) dynamically calculates how much time remained (ETA) and displays the remaining distance countdown.
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-900 text-white font-bold flex items-center justify-center shrink-0">3</span>
              <div>
                <h4 className="font-bold text-stone-900">Live Vector Transit & Progress Tracking</h4>
                <p className="text-stone-600 mt-0.5">
                  Moving mascot navigates the Mysuru city schematic map. Distance to delivery location continuously decrements with live waypoint milestone updates.
                </p>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-teal-900 text-white font-bold flex items-center justify-center shrink-0">4</span>
              <div>
                <h4 className="font-bold text-stone-900">4-Digit Recipient OTP Handover Verification</h4>
                <p className="text-stone-600 mt-0.5">
                  Upon arriving, the receiving ashram manager inspects packages and gives the secret 4-digit PIN. The volunteer enters this OTP into their console to complete the mission, which is recorded in MongoDB.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-200">
            <span className="text-[11px] text-stone-500 font-mono">Simulate entire cycle in 15 seconds</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setDemoModalOpen(false)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunFastDemo}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1.5"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Run 15-Second Fast Demo</span>
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
