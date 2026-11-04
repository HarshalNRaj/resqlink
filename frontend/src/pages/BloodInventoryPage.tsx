/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { PageId, BloodGroup, BloodRequest, BloodBank, BloodDonationPledge } from '../types';
import { SAMPLE_BLOOD_BANKS, SAMPLE_BLOOD_REQUESTS } from '../data/sampleData';
import { Button, Card, NoticeBanner, Modal } from '../components/common/UIComponents';
import {
  Droplet,
  AlertCircle,
  PlusCircle,
  Hospital,
  Phone,
  Clock,
  CheckCircle2,
  FileCheck,
} from 'lucide-react';

interface BloodInventoryPageProps {
  setCurrentPage: (page: PageId) => void;
  bloodRequests: BloodRequest[];
  onAddBloodRequest: (req: BloodRequest) => void;
  onPledgeBlood?: (pledge: BloodDonationPledge) => void;
}

export function BloodInventoryPage({
  setCurrentPage,
  bloodRequests,
  onAddBloodRequest,
  onPledgeBlood,
}: BloodInventoryPageProps) {
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedBankId, setSelectedBankId] = useState<string>('all');

  // Emergency SOS Request Form Modal
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [reqFormData, setReqFormData] = useState({
    patientName: '',
    hospitalName: '',
    city: 'Bengaluru',
    bloodGroup: 'O-' as BloodGroup,
    unitsRequired: '2',
    urgency: 'Immediate (Within 3 Hours)' as BloodRequest['urgency'],
    contactPerson: '',
    contactPhone: '',
    doctorVerified: true,
  });
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Quick donate pledge modal for requests
  const [pledgeTarget, setPledgeTarget] = useState<BloodRequest | null>(null);
  const [pledgeSuccess, setPledgeSuccess] = useState(false);
  const [donorPledgeName, setDonorPledgeName] = useState('');
  const [donorPledgePhone, setDonorPledgePhone] = useState('');

  const bloodGroups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqFormData.patientName || !reqFormData.hospitalName || !reqFormData.contactPhone) return;

    const newReq: BloodRequest = {
      id: `req-${Date.now().toString().slice(-4)}`,
      patientName: reqFormData.patientName,
      hospitalName: reqFormData.hospitalName,
      city: reqFormData.city,
      bloodGroup: reqFormData.bloodGroup,
      unitsRequired: parseInt(reqFormData.unitsRequired) || 1,
      urgency: reqFormData.urgency,
      contactPerson: reqFormData.contactPerson,
      contactPhone: reqFormData.contactPhone,
      postedDate: 'Just now',
      status: 'Open',
      doctorPrescriptionVerified: reqFormData.doctorVerified,
    };

    onAddBloodRequest(newReq);
    setRequestSubmitted(true);
  };

  const getStatusBadge = (status: 'Sufficient' | 'Moderate' | 'Critical Shortage') => {
    switch (status) {
      case 'Critical Shortage':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <AlertCircle className="w-3 h-3" />
            <span>Critical Shortage</span>
          </span>
        );
      case 'Moderate':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <span>Moderate</span>
          </span>
        );
      case 'Sufficient':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Sufficient</span>
          </span>
        );
    }
  };

  const filteredBanks = SAMPLE_BLOOD_BANKS.filter(
    (b) => selectedBankId === 'all' || b.id === selectedBankId
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-800 mb-1">
            Real-Time Medical Logistics
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            Blood Inventory & Emergency Requests
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Live unit availability across accredited blood banks and emergency SOS requests for hospitalized patients.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="accent"
            size="md"
            onClick={() => {
              setRequestModalOpen(true);
              setRequestSubmitted(false);
            }}
            className="bg-rose-700 hover:bg-rose-800 text-white"
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            <span>Post Emergency Blood Request</span>
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => setCurrentPage('blood-banks')}
          >
            Blood Bank Centers
          </Button>
        </div>
      </div>

      <NoticeBanner
        type="warning"
        title="Demonstration Inventory Index"
        message="Stock units and response times are simulated for demonstration. In a medical crisis, connect directly with hospital blood coordinators or call our toll-free hotline: 1800-419-7000."
      />

      {/* Section 1: Active Patient Emergency Requests */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
            <h2 className="text-xl font-bold text-stone-900 font-serif">
              Active Emergency SOS Requests ({bloodRequests.length})
            </h2>
          </div>
          <span className="text-xs text-stone-500">Auto-refreshing</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bloodRequests.map((req) => (
            <Card
              key={req.id}
              className={`border-l-4 ${
                req.urgency.includes('Immediate')
                  ? 'border-l-rose-600 bg-rose-50/20'
                  : 'border-l-amber-500 bg-white'
              } flex flex-col justify-between`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-mono font-extrabold text-rose-800 bg-rose-100/80 px-2.5 py-1 rounded-lg">
                      {req.bloodGroup}
                    </span>
                    <div>
                      <p className="text-xs text-stone-500 font-medium">Required: {req.unitsRequired} Units</p>
                      <p className="text-[11px] text-stone-400">{req.city}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      req.status === 'Open'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {req.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-stone-900">{req.patientName}</h3>
                  <p className="text-xs text-stone-600 flex items-center gap-1 mt-0.5">
                    <Hospital className="w-3 h-3 text-stone-400" />
                    <span>{req.hospitalName}</span>
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200/60 text-xs space-y-1">
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-stone-400" />
                      <span>Urgency:</span>
                    </span>
                    <span className="font-semibold text-rose-900">{req.urgency}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Contact:</span>
                    <span className="font-medium text-stone-900">{req.contactPerson}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between">
                <a
                  href={`tel:${req.contactPhone}`}
                  className="text-xs font-mono font-bold text-teal-900 hover:underline flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  <span>{req.contactPhone}</span>
                </a>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setPledgeTarget(req);
                    setPledgeSuccess(false);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white"
                >
                  I Can Donate
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Section 2: Tabular Live Blood Inventory Matrix */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900 font-serif">
              Facility Blood Stock Matrix
            </h2>
            <p className="text-xs text-stone-500">
              Live inventory broken down by certified blood bank and specific blood group.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 bg-white"
            >
              <option value="all">All Blood Banks (Combined Matrix)</option>
              {SAMPLE_BLOOD_BANKS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Group Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedGroupFilter('all')}
            className={`px-3 py-1 text-xs rounded-lg font-medium cursor-pointer ${
              selectedGroupFilter === 'all'
                ? 'bg-teal-900 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            All Groups
          </button>
          {bloodGroups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroupFilter(group)}
              className={`px-3 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer ${
                selectedGroupFilter === group
                  ? 'bg-teal-900 text-white'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {group}
            </button>
          ))}
        </div>

        {/* Tabular Numerals Inventory Table */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-700 uppercase font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Blood Bank / Facility</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3">Units Available</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last Verified</th>
                  <th className="px-4 py-3 text-right">Emergency Requisition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredBanks.flatMap((bank) =>
                  bank.inventory
                    .filter(
                      (item) =>
                        selectedGroupFilter === 'all' || item.bloodGroup === selectedGroupFilter
                    )
                    .map((item, idx) => (
                      <tr key={`${bank.id}-${item.bloodGroup}-${idx}`} className="hover:bg-stone-50/70">
                        <td className="px-4 py-3 font-medium text-stone-900">{bank.name}</td>
                        <td className="px-4 py-3 text-stone-600">{bank.city}</td>
                        <td className="px-4 py-3 font-mono font-extrabold text-stone-900">
                          {item.bloodGroup}
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums text-sm font-bold text-stone-900">
                          {item.unitsAvailable} Units
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-stone-500 tabular-nums">{item.lastUpdated}</td>
                        <td className="px-4 py-3 text-right">
                          <a
                            href={`tel:${bank.emergencyPhone}`}
                            className="inline-flex items-center gap-1 font-mono text-teal-900 hover:underline font-semibold"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{bank.emergencyPhone}</span>
                          </a>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Emergency Request Modal */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Post Patient Emergency Blood Request"
        subtitle="This triggers immediate notification to matching voluntary donors"
      >
        {requestSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-rose-100 text-rose-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Emergency Request Broadcast</h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              SOS for <strong className="text-stone-900">{reqFormData.patientName}</strong> (
              {reqFormData.bloodGroup}, {reqFormData.unitsRequired} units) at{' '}
              {reqFormData.hospitalName} has been posted to the active emergency board.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRequestModalOpen(false)}
                className="bg-teal-900"
              >
                Return to Live Board
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div className="p-3 bg-rose-50/70 border border-rose-200/70 rounded-lg text-xs text-rose-950 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>
                Please ensure you have an authorized doctor's requisition form with hospital seal
                before submitting.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Patient Name & Age *
              </label>
              <input
                type="text"
                required
                value={reqFormData.patientName}
                onChange={(e) => setReqFormData({ ...reqFormData, patientName: e.target.value })}
                placeholder="e.g. Ramesh Chandra (Age 45)"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Hospital Name & Ward *
                </label>
                <input
                  type="text"
                  required
                  value={reqFormData.hospitalName}
                  onChange={(e) => setReqFormData({ ...reqFormData, hospitalName: e.target.value })}
                  placeholder="e.g. Fortis Hospital ICU"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">City *</label>
                <input
                  type="text"
                  value={reqFormData.city}
                  onChange={(e) => setReqFormData({ ...reqFormData, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Required Blood Group *
                </label>
                <select
                  value={reqFormData.bloodGroup}
                  onChange={(e) =>
                    setReqFormData({ ...reqFormData, bloodGroup: e.target.value as BloodGroup })
                  }
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
                >
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Units Required *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={reqFormData.unitsRequired}
                  onChange={(e) =>
                    setReqFormData({ ...reqFormData, unitsRequired: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Urgency *</label>
                <select
                  value={reqFormData.urgency}
                  onChange={(e) =>
                    setReqFormData({
                      ...reqFormData,
                      urgency: e.target.value as BloodRequest['urgency'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
                >
                  <option value="Immediate (Within 3 Hours)">Immediate (&lt; 3 Hours)</option>
                  <option value="Urgent (Within 12 Hours)">Urgent (&lt; 12 Hours)</option>
                  <option value="Standard (Within 24 Hours)">Standard (&lt; 24 Hours)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Attendant / Coordinator Name *
                </label>
                <input
                  type="text"
                  required
                  value={reqFormData.contactPerson}
                  onChange={(e) =>
                    setReqFormData({ ...reqFormData, contactPerson: e.target.value })
                  }
                  placeholder="e.g. Anand Rao (Brother)"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={reqFormData.contactPhone}
                  onChange={(e) =>
                    setReqFormData({ ...reqFormData, contactPhone: e.target.value })
                  }
                  placeholder="+91 98450 11223"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reqFormData.doctorVerified}
                  onChange={(e) =>
                    setReqFormData({ ...reqFormData, doctorVerified: e.target.checked })
                  }
                  className="rounded text-teal-900 focus:ring-teal-700 w-4 h-4"
                />
                <span className="text-xs text-stone-600">
                  I certify that a legitimate medical requisition was issued by a registered physician.
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRequestModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-rose-700 text-white">
                Submit SOS Request
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* "I Can Donate" Pledge Modal */}
      <Modal
        isOpen={!!pledgeTarget}
        onClose={() => setPledgeTarget(null)}
        title="Direct Donor Response"
        subtitle={pledgeTarget ? `Patient: ${pledgeTarget.patientName} (${pledgeTarget.bloodGroup})` : ''}
      >
        {pledgeSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Coordinator Connected</h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              Your contact details have been sent to patient attendant{' '}
              <strong className="text-stone-900">{pledgeTarget?.contactPerson}</strong> at{' '}
              {pledgeTarget?.hospitalName}.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPledgeTarget(null)}
                className="bg-teal-900"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-stone-900">{pledgeTarget?.hospitalName}</p>
              <p className="text-stone-600">
                Blood Group: <span className="font-bold font-mono text-rose-800">{pledgeTarget?.bloodGroup}</span> ·{' '}
                Units needed: {pledgeTarget?.unitsRequired}
              </p>
              <p className="text-stone-500">Attendant Contact: {pledgeTarget?.contactPhone}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                value={donorPledgeName}
                onChange={(e) => setDonorPledgeName(e.target.value)}
                placeholder="e.g. Vikram Sen"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Your Contact Phone *</label>
              <input
                type="tel"
                required
                value={donorPledgePhone}
                onChange={(e) => setDonorPledgePhone(e.target.value)}
                placeholder="+91 98450 00000"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPledgeTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!donorPledgeName.trim() || !donorPledgePhone.trim() || !pledgeTarget) return;
                  if (onPledgeBlood) {
                    onPledgeBlood({
                      id: `pld-${Date.now().toString().slice(-4)}`,
                      requestId: pledgeTarget.id,
                      patientName: pledgeTarget.patientName,
                      hospitalName: pledgeTarget.hospitalName,
                      bloodGroup: pledgeTarget.bloodGroup,
                      donorName: donorPledgeName,
                      donorPhone: donorPledgePhone,
                      pledgedDate: new Date().toISOString().split('T')[0],
                      status: 'Pledge Confirmed',
                    });
                  }
                  setPledgeSuccess(true);
                }}
                className="bg-rose-700 hover:bg-rose-800 text-white cursor-pointer"
              >
                Confirm Readiness to Donate
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
