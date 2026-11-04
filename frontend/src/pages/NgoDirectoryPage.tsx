/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PageId, NGOProfile } from '../types';
import { SAMPLE_NGOS } from '../data/sampleData';
import { Button, Card, MetadataRow, Modal } from '../components/common/UIComponents';
import {
  Search,
  Building2,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Users,
  Calendar,
  Heart,
  CheckCircle2,
} from 'lucide-react';

interface NgoDirectoryPageProps {
  setCurrentPage: (page: PageId) => void;
  ngos?: NGOProfile[];
}

export function NgoDirectoryPage({ setCurrentPage, ngos: propNgos }: NgoDirectoryPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');

  const [activeNgoSupport, setActiveNgoSupport] = useState<NGOProfile | null>(null);
  const [pledgeItem, setPledgeItem] = useState('');
  const [pledgeSubmitted, setPledgeSubmitted] = useState(false);

  const ngosList = propNgos || SAMPLE_NGOS;

  const filteredNgos = ngosList.filter((ngo) => {
    const ngoName = typeof ngo.name === 'string' ? ngo.name : '';
    const summaryText = typeof ngo.summary === 'string' ? ngo.summary : '';
    const focusList = Array.isArray(ngo.focusAreas) ? ngo.focusAreas : [];

    const matchesSearch =
      searchTerm === '' ||
      ngoName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      summaryText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      focusList.some((fa) => typeof fa === 'string' && fa.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === 'all' || ngo.type === selectedType;
    const matchesCity = selectedCity === 'all' || ngo.city === selectedCity;

    return matchesSearch && matchesType && matchesCity;
  });

  const handlePledgeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPledgeSubmitted(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">
            Care Sanctuary Registry
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            NGO & Ashram Directory
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Accredited senior living sanctuaries, orphanages, and community food kitchens verified for direct aid.
          </p>
        </div>

        <Button
          variant="outline"
          size="md"
          onClick={() => setCurrentPage('ngo-register')}
          className="border-teal-800 text-teal-950 hover:bg-teal-50 shrink-0"
        >
          <Building2 className="w-4 h-4 mr-1.5" />
          <span>Register New NGO / Ashram</span>
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, focus areas (e.g. elderly care, children, hunger)..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="all">All Organization Types</option>
              <option value="Ashram">Ashrams & Elder Sanctuaries</option>
              <option value="Child Care Trust">Child Care Trusts & Orphanages</option>
              <option value="Community Relief">Community Relief & Kitchens</option>
              <option value="Shelter Home">Shelter Homes</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="all">All Cities</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="New Delhi">New Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>
        </div>
      </div>

      {/* Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredNgos.map((ngo) => (
          <Card key={ngo.id} className="flex flex-col justify-between hover:border-teal-700/60 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{ngo.verifiedStatus || ((ngo as any).verified ? 'Verified' : 'Pending Verification')}</span>
                    </span>
                    <span className="text-xs text-stone-500">{ngo.type}</span>
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 leading-snug">{ngo.name}</h3>
                </div>
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                {ngo.summary || `${ngo.name} provides dedicated community care and distribution services in ${ngo.city}.`}
              </p>

              {/* Key Stats strip */}
              <div className="grid grid-cols-2 gap-2 text-xs p-3 bg-stone-50 rounded-lg border border-stone-100">
                <div className="flex items-center gap-2 text-stone-600">
                  <Users className="w-4 h-4 text-teal-800 shrink-0" />
                  <span>
                    <strong className="text-stone-900 tabular-nums">
                      {ngo.beneficiaryCount ?? (ngo as any).beneficiaries ?? 50}
                    </strong>{' '}
                    Residents
                  </span>
                </div>
                <div className="flex items-center gap-2 text-stone-600">
                  <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                  <span>Est. {ngo.yearEstablished || 2018}</span>
                </div>
              </div>

              {/* Active Needs */}
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-stone-400 mb-2">
                  Immediate Wishlist & Needs:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(ngo.activeNeeds || (ngo as any).immediateNeeds || []).map((need: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs bg-amber-50 text-amber-900 border border-amber-200/70 px-2.5 py-1 rounded-md"
                    >
                      {need}
                    </span>
                  ))}
                </div>
              </div>

              {/* Contact info */}
              <div className="pt-2 text-xs text-stone-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                  <span>
                    {ngo.address}, {ngo.city}, {ngo.state}
                  </span>
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <a
                    href={`tel:${ngo.phone}`}
                    className="flex items-center gap-1 text-teal-900 hover:underline font-medium"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>{ngo.phone}</span>
                  </a>
                  <a
                    href={`mailto:${ngo.email}`}
                    className="flex items-center gap-1 text-teal-900 hover:underline"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{ngo.email}</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[11px] text-stone-400 font-mono">
                Reg: {ngo.registrationNumber || (ngo as any).darpanId || 'REG-ACCREDITED'}
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActiveNgoSupport(ngo);
                  setPledgeSubmitted(false);
                  setPledgeItem('');
                }}
                className="bg-teal-900 hover:bg-teal-800"
              >
                <Heart className="w-3.5 h-3.5 mr-1" />
                <span>Pledge Supplies</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Support / Pledge Modal */}
      <Modal
        isOpen={!!activeNgoSupport}
        onClose={() => setActiveNgoSupport(null)}
        title="Direct Ashram / NGO Supply Pledge"
        subtitle={activeNgoSupport ? activeNgoSupport.name : ''}
      >
        {pledgeSubmitted ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Pledge Recorded</h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              Your pledge to supply items to{' '}
              <strong className="text-stone-900">{activeNgoSupport?.name}</strong> has been forwarded
              to their administrator.
            </p>
            <div className="pt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setActiveNgoSupport(null)}
                className="bg-teal-900"
              >
                Return to Directory
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePledgeSubmit} className="space-y-4">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-stone-900">{activeNgoSupport?.name}</p>
              <p className="text-stone-600">
                Care focus: {(activeNgoSupport?.focusAreas || []).join(', ')} ·{' '}
                {activeNgoSupport?.beneficiaryCount ?? (activeNgoSupport as any)?.beneficiaries ?? 50} Residents
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Select from their active wishlist or specify your contribution:
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(activeNgoSupport?.activeNeeds || (activeNgoSupport as any)?.immediateNeeds || []).map((need: string, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPledgeItem(need)}
                    className="text-xs px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                  >
                    + {need}
                  </button>
                ))}
              </div>
              <input
                type="text"
                required
                value={pledgeItem}
                onChange={(e) => setPledgeItem(e.target.value)}
                placeholder="e.g. 50 kg pulse rations or 20 thermal blankets"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Your Name / Organization *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sunita Nair"
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
                  placeholder="+91 98450 00000"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveNgoSupport(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-teal-900">
                Confirm Supply Pledge
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
