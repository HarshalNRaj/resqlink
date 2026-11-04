/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PageId, BloodBank, BloodGroup } from '../types';
import { SAMPLE_BLOOD_BANKS } from '../data/sampleData';
import { Button, Card, Modal, NoticeBanner } from '../components/common/UIComponents';
import {
  Droplet,
  PhoneCall,
  Clock,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building,
  Heart,
  Calendar,
} from 'lucide-react';

export function BloodBankDirectoryPage({ setCurrentPage }: { setCurrentPage: (page: PageId) => void }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');

  // Blood Donor Registration Modal
  const [donorModalOpen, setDonorModalOpen] = useState(false);
  const [donorData, setDonorData] = useState({
    name: '',
    bloodGroup: 'O+' as BloodGroup,
    phone: '',
    city: 'Bengaluru',
    lastDonatedMonthsAgo: '4',
    emergencyAvailability: true,
  });
  const [donorSuccess, setDonorSuccess] = useState(false);

  const filteredBanks = SAMPLE_BLOOD_BANKS.filter((bb) => {
    const matchesSearch =
      searchTerm === '' ||
      bb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bb.address.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCity = selectedCity === 'all' || bb.city === selectedCity;

    return matchesSearch && matchesCity;
  });

  const handleRegisterDonor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!donorData.name || !donorData.phone) return;
    setDonorSuccess(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-800 mb-1">
            Emergency Medical Infrastructure
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            Blood Bank & Apheresis Directory
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Certified government and charitable blood centers operating 24x7 with component separation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="accent"
            size="md"
            onClick={() => {
              setDonorModalOpen(true);
              setDonorSuccess(false);
            }}
            className="bg-rose-700 hover:bg-rose-800 text-white"
          >
            <Heart className="w-4 h-4 mr-1.5" />
            <span>Enroll as Voluntary Blood Donor</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setCurrentPage('blood-inventory')}
            className="bg-teal-900 hover:bg-teal-800"
          >
            <Droplet className="w-4 h-4 mr-1.5" />
            <span>View Live Blood Stock Matrix</span>
          </Button>
        </div>
      </div>

      <NoticeBanner
        type="warning"
        title="Emergency Patient Protocol"
        message="For critical surgeries or trauma emergencies, please call the blood bank's dedicated 24x7 emergency line directly with the attending physician's cross-match requisition slip."
      />

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search blood center by name or address..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="all">All Cities</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="New Delhi">New Delhi</option>
              <option value="Mumbai">Mumbai</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blood Banks Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredBanks.map((bb) => (
          <Card
            key={bb.id}
            className="flex flex-col justify-between hover:border-teal-700/60 transition-all space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
                      {bb.category}
                    </span>
                    {bb.is24x7 && (
                      <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>24x7 Open</span>
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-stone-900 leading-snug">{bb.name}</h3>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                {bb.address}, {bb.city}, {bb.state}
              </p>

              {/* Emergency Contact Box */}
              <div className="p-3 bg-rose-50/70 border border-rose-200/60 rounded-lg text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-rose-900 flex items-center gap-1">
                    <PhoneCall className="w-3.5 h-3.5 text-rose-700" />
                    <span>24x7 Emergency Line:</span>
                  </span>
                  <a
                    href={`tel:${bb.emergencyPhone}`}
                    className="font-mono font-bold text-rose-900 hover:underline"
                  >
                    {bb.emergencyPhone}
                  </a>
                </div>
                <div className="flex items-center justify-between text-stone-600 pt-1 border-t border-rose-100">
                  <span>General Inquiry:</span>
                  <span className="font-mono">{bb.generalPhone}</span>
                </div>
              </div>

              {/* Component Availability Badges */}
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-400">
                  Components Processed:
                </p>
                <div className="flex flex-wrap gap-1 text-[11px]">
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700">Packed Red Cells (PRBC)</span>
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700">Platelet Concentrates</span>
                  <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-700">Fresh Frozen Plasma</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 font-mono">Lic: {bb.licenseNumber}</span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage('blood-inventory')}
                className="bg-teal-900 hover:bg-teal-800"
              >
                <span>Check Inventory</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Voluntary Blood Donor Registration Modal */}
      <Modal
        isOpen={donorModalOpen}
        onClose={() => setDonorModalOpen(false)}
        title="Voluntary Blood Donor Enrollment"
        subtitle="Be on standby for urgent matching when hospitals face rare blood shortages"
      >
        {donorSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Donor Profile Registered</h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              Thank you, <strong className="text-stone-900">{donorData.name}</strong> ({donorData.bloodGroup}).
              Your registry entry has been connected to emergency blood alerts in {donorData.city}.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDonorModalOpen(false)}
                className="bg-teal-900"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegisterDonor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={donorData.name}
                onChange={(e) => setDonorData({ ...donorData, name: e.target.value })}
                placeholder="e.g. Anand Varma"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Blood Group *
                </label>
                <select
                  value={donorData.bloodGroup}
                  onChange={(e) =>
                    setDonorData({ ...donorData, bloodGroup: e.target.value as BloodGroup })
                  }
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
                >
                  {(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as BloodGroup[]).map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={donorData.phone}
                  onChange={(e) => setDonorData({ ...donorData, phone: e.target.value })}
                  placeholder="+91 98450 11223"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">City *</label>
                <input
                  type="text"
                  value={donorData.city}
                  onChange={(e) => setDonorData({ ...donorData, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Months Since Last Donation
                </label>
                <input
                  type="number"
                  min="0"
                  value={donorData.lastDonatedMonthsAgo}
                  onChange={(e) =>
                    setDonorData({ ...donorData, lastDonatedMonthsAgo: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={donorData.emergencyAvailability}
                  onChange={(e) =>
                    setDonorData({ ...donorData, emergencyAvailability: e.target.checked })
                  }
                  className="rounded text-teal-900 focus:ring-teal-700 w-4 h-4"
                />
                <span className="text-xs text-stone-600">
                  I agree to receive urgent SMS / WhatsApp alerts if a matching patient in my city
                  requires immediate transfusion.
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDonorModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-rose-700 text-white">
                Register as Voluntary Donor
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
