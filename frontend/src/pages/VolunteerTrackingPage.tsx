/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PageId, SupplyDeliveryMission, UserRole } from '../types';
import { SAMPLE_SUPPLY_MISSIONS } from '../data/sampleData';
import { VolunteerSupplyTracker } from '../components/volunteers/VolunteerSupplyTracker';
import { Button, Card, NoticeBanner } from '../components/common/UIComponents';
import {
  Truck,
  Navigation,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldCheck,
  Compass,
  PlusCircle,
  Package,
  Layers,
  Sparkles,
  Phone,
  Search,
  Filter,
  UserCheck,
  Radio,
} from 'lucide-react';

interface VolunteerTrackingPageProps {
  setCurrentPage: (page: PageId) => void;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
  missions?: SupplyDeliveryMission[];
  onUpdateMission?: (mission: SupplyDeliveryMission) => void;
  onCompleteDelivery?: (
    missionId: string,
    proof: NonNullable<SupplyDeliveryMission['proofOfDelivery']>
  ) => void;
}

export function VolunteerTrackingPage({
  setCurrentPage,
  currentRole = 'volunteer',
  onRoleChange,
  missions: propMissions,
  onUpdateMission,
  onCompleteDelivery,
}: VolunteerTrackingPageProps) {
  const [localMissions, setLocalMissions] = useState<SupplyDeliveryMission[]>(
    propMissions || SAMPLE_SUPPLY_MISSIONS
  );
  const missions = propMissions || localMissions;

  const [selectedMissionId, setSelectedMissionId] = useState<string>(
    missions[0]?.id || 'mission-01'
  );
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_transit' | 'delivered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeMission =
    missions.find((m) => m.id === selectedMissionId) || missions[0] || SAMPLE_SUPPLY_MISSIONS[0];

  const filteredMissions = missions.filter((m) => {
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'in_transit' && (m.status === 'in_transit' || m.status === 'near_destination' || m.status === 'at_pickup')) ||
      (filterStatus === 'delivered' && m.status === 'delivered');

    const matchesSearch =
      searchQuery === '' ||
      m.resourceTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.volunteer.name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const handleUpdate = (updated: SupplyDeliveryMission) => {
    setLocalMissions((prev) =>
      prev.map((m) => (m.id === updated.id ? updated : m))
    );
    onUpdateMission?.(updated);
  };

  const handleComplete = (
    missionId: string,
    proof: NonNullable<SupplyDeliveryMission['proofOfDelivery']>
  ) => {
    setLocalMissions((prev) =>
      prev.map((m) =>
        m.id === missionId
          ? {
              ...m,
              status: 'delivered' as const,
              estimatedArrivalMinutes: 0,
              distanceRemainingKm: 0,
              currentSpeedKmh: 0,
              proofOfDelivery: proof,
            }
          : m
      )
    );
    onCompleteDelivery?.(missionId, proof);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Live Logistics & Telemetry
            </span>
            <span className="text-xs text-stone-500 font-mono">Swiggy-Style Tracking Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            Live Volunteer Supply Run Tracker
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl">
            Real-time GPS telemetry and vector route tracking for community relief dispatches. Monitor volunteers as they transport rations, mobility equipment, and emergency medical kits to ashrams and shelters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage('volunteers')}
            className="text-teal-900 border-teal-800"
          >
            ← Back to Volunteer Hub
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCurrentPage('resources')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Request / Dispatch Supplies</span>
          </Button>
        </div>
      </div>

      {/* Role Context & Live Mode Banner */}
      <div className={`rounded-2xl p-4 border transition-all ${
        currentRole === 'volunteer'
          ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-emerald-500/40 shadow-lg'
          : 'bg-stone-100 text-stone-800 border-stone-300'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              currentRole === 'volunteer' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-stone-200 text-stone-600'
            }`}>
              <Radio className={`w-5 h-5 ${currentRole === 'volunteer' ? 'animate-pulse text-emerald-400' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10">
                  {currentRole === 'volunteer' ? '🛵 Volunteer Driver Mode (Mysuru Corps)' : `Observer View (${currentRole.replace('_', ' ')})`}
                </span>
                <span className="text-xs text-emerald-300/90 font-mono">
                  Location: Mysuru, Karnataka
                </span>
              </div>
              <p className="text-xs mt-0.5 text-stone-200">
                {currentRole === 'volunteer'
                  ? 'You are active as Rajesh K. Gowda (KA-09-EV-4921). Your device can broadcast live real-time GPS telemetry to the receiving sanctuary in Kuvempunagar, Mysuru.'
                  : 'You are currently observing live supply telemetry. Switch to Volunteer Driver Mode to broadcast your real device location in Mysuru.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            {currentRole !== 'volunteer' ? (
              <button
                onClick={() => onRoleChange?.('volunteer')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Switch to Volunteer Driver Mode</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Driver Transceiver Active</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Swiggy-Style Live Supply Tracker */}
      {activeMission ? (
        <VolunteerSupplyTracker
          mission={activeMission}
          currentRole={currentRole}
          onUpdateMission={handleUpdate}
          onCompleteDelivery={handleComplete}
        />
      ) : (
        <NoticeBanner
          type="info"
          title="No Active Missions"
          message="There are currently no active supply runs assigned. You can initiate a supply run from the Resources or User Dashboard."
        />
      )}

      {/* Supply Missions Selector & Registry Carousel */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-teal-950 font-serif">
              Active Supply Runs & Dispatch Missions
            </h3>
            <p className="text-xs text-stone-500">
              Select any live delivery to view its interactive GPS route, speed, and delivery PIN.
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-stone-200 bg-white p-1 text-xs">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filterStatus === 'all'
                    ? 'bg-teal-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Runs ({missions.length})
              </button>
              <button
                onClick={() => setFilterStatus('in_transit')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filterStatus === 'in_transit'
                    ? 'bg-teal-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                In Transit ({missions.filter((m) => m.status !== 'delivered').length})
              </button>
              <button
                onClick={() => setFilterStatus('delivered')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filterStatus === 'delivered'
                    ? 'bg-teal-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Delivered ({missions.filter((m) => m.status === 'delivered').length})
              </button>
            </div>
          </div>
        </div>

        {/* Missions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredMissions.map((m) => {
            const isSelected = m.id === selectedMissionId;
            const isInTransit = m.status === 'in_transit' || m.status === 'near_destination';

            return (
              <div
                key={m.id}
                onClick={() => {
                  setSelectedMissionId(m.id);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative bg-white ${
                  isSelected
                    ? 'border-emerald-600 ring-2 ring-emerald-500/30 shadow-md bg-emerald-50/20'
                    : 'border-stone-200/80 hover:border-emerald-300 hover:shadow-sm'
                }`}
              >
                {/* Active Indicator */}
                {isSelected && (
                  <span className="absolute -top-2.5 right-4 bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full shadow-xs">
                    Viewing Live
                  </span>
                )}

                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[11px] font-bold text-stone-500">
                    #{m.trackingNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      m.status === 'delivered'
                        ? 'bg-teal-50 text-teal-800 border-teal-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 animate-pulse'
                    }`}
                  >
                    {m.status === 'delivered' ? '✓ Delivered' : `🛵 In Transit (${m.estimatedArrivalMinutes}m)`}
                  </span>
                </div>

                <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{m.resourceTitle}</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Quantity: <strong className="text-stone-700">{m.quantity}</strong>
                </p>

                <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <img
                      src={
                        m.volunteer.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
                      }
                      alt={m.volunteer.name}
                      className="w-7 h-7 rounded-full object-cover border border-emerald-400"
                    />
                    <div>
                      <p className="font-semibold text-stone-800 text-[11px]">{m.volunteer.name}</p>
                      <p className="text-[10px] text-stone-500">{m.volunteer.vehicleType.split('(')[0]}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">Recipient</span>
                    <span className="text-[11px] font-semibold text-teal-900 line-clamp-1 max-w-[120px]">
                      {m.recipientName}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs bg-stone-50 p-2 rounded-xl">
                  <span className="text-[11px] text-stone-600">
                    {isInTransit ? `${m.distanceRemainingKm} km left` : 'Completed Handover'}
                  </span>
                  <span className="font-mono font-bold text-teal-950 text-xs">
                    PIN: {m.deliveryPin}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
