/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PageId } from '../types';
import { SAMPLE_RESOURCES, SAMPLE_NGOS, SAMPLE_BLOOD_REQUESTS } from '../data/sampleData';
import { Button, Card, MetadataRow } from '../components/common/UIComponents';
import {
  Package,
  HeartHandshake,
  Droplet,
  Users,
  ShieldCheck,
  ArrowRight,
  Clock,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export function HomePage({ setCurrentPage }: { setCurrentPage: (page: PageId) => void }) {
  return (
    <div className="space-y-16 lg:space-y-24 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 lg:pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Waste · Dignified Aid · Direct Connection</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-teal-950 font-serif leading-[1.15]" style={{ textWrap: 'balance' }}>
                Connecting surplus resources with people and care sanctuaries in need.
              </h1>

              <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-2xl">
                GiveConnect bridges individual donors, emergency blood banks, volunteers, and verified
                ashrams to redistribute essential rations, clothing, medical aids, and life-saving blood units
                with zero intermediaries.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => setCurrentPage('donate')}
                  className="bg-teal-900 hover:bg-teal-800 shadow-sm"
                >
                  <span>Donate Resources</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setCurrentPage('resources')}
                  className="border-stone-300 text-stone-800"
                >
                  Find Available Supplies
                </Button>
                <Button
                  variant="accent"
                  size="lg"
                  onClick={() => setCurrentPage('blood-inventory')}
                  className="bg-amber-600 hover:bg-amber-700 shadow-sm"
                >
                  <Droplet className="w-4 h-4 mr-1.5" />
                  <span>Blood Emergency</span>
                </Button>
              </div>

              {/* Verified Trust Strip */}
              <div className="pt-6 border-t border-stone-200/80 flex flex-wrap items-center gap-6 text-xs text-stone-600">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>100% Verified NGOs & Ashrams</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  <span>Direct Donor-to-Recipient Logistics</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Droplet className="w-4 h-4 text-rose-700" />
                  <span>Licensed Blood Bank Integration</span>
                </div>
              </div>
            </div>

            {/* Right Hero Image */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-stone-200 shadow-lg bg-stone-100">
                <img
                  src="/src/assets/images/hero_community_giving_1793546425262.jpg"
                  alt="Volunteers and community members sorting food and care packages"
                  className="w-full h-84 sm:h-96 lg:h-110 object-cover"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-1">
                    Community Redistribution Drive
                  </p>
                  <p className="text-sm font-medium text-stone-100">
                    Empowering local shelters with verified surplus nutrition and winter supplies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-teal-950 font-serif">
            A comprehensive redistribution ecosystem
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            Organized across four vital pillars ensuring every donation reaches dignified, verified destinations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Pillar 1 */}
          <Card className="hover:border-teal-700 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center mb-4 group-hover:bg-teal-900 group-hover:text-white transition-colors">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Resource Redistribution</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                Surplus food grains, winter blankets, textbooks, wheelchair mobility aids, and hygiene kits
                listed by donors and requested by communities.
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('resources')}
              className="text-xs font-semibold text-teal-800 hover:text-teal-950 inline-flex items-center gap-1 group-hover:underline cursor-pointer"
            >
              <span>Explore Supplies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Pillar 2 */}
          <Card className="hover:border-teal-700 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-4 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">NGO & Ashram Care</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                Verified registry of eldercare ashrams, children shelters, and special needs centers with
                active item wishlists and transparent direct support.
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('ngos')}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1 group-hover:underline cursor-pointer"
            >
              <span>View Directory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Pillar 3 */}
          <Card className="hover:border-teal-700 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-800 flex items-center justify-center mb-4 group-hover:bg-rose-800 group-hover:text-white transition-colors">
                <Droplet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Blood Emergency Hub</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                Licensed blood bank inventory tracking, urgent emergency SOS patient requests, and voluntary
                blood donor community coordination.
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('blood-inventory')}
              className="text-xs font-semibold text-rose-800 hover:text-rose-950 inline-flex items-center gap-1 group-hover:underline cursor-pointer"
            >
              <span>Check Live Stock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>

          {/* Pillar 4 */}
          <Card className="hover:border-teal-700 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-4 group-hover:bg-amber-700 group-hover:text-white transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900 mb-2">Volunteer Corps</h3>
              <p className="text-xs text-stone-600 leading-relaxed mb-4">
                Mobilize local volunteers for weekend grain sorting, relief packaging, blood donation camp
                assistance, and eldercare companionship.
              </p>
            </div>
            <button
              onClick={() => setCurrentPage('volunteers')}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 inline-flex items-center gap-1 group-hover:underline cursor-pointer"
            >
              <span>Join Active Tasks</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </Card>
        </div>
      </section>

      {/* Featured Resources Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-1">
              Sample Platform Directory
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-teal-950 font-serif">
              Recent verified resources available
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage('resources')}
            className="self-start sm:self-auto"
          >
            <span>View All Available Supplies</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SAMPLE_RESOURCES.slice(0, 3).map((item) => (
            <Card key={item.id} className="flex flex-col justify-between hover:border-teal-600 transition-all">
              <div className="space-y-3">
                {item.imageUrl && (
                  <div className="rounded-lg overflow-hidden h-40 bg-stone-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div>
                  <MetadataRow
                    items={[
                      item.categoryLabel,
                      `${item.city}, ${item.locality}`,
                      item.condition,
                    ]}
                    className="mb-1.5"
                  />
                  <h3 className="text-base font-bold text-stone-900 line-clamp-2 leading-snug">
                    {item.title}
                  </h3>
                </div>
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 text-xs">
                  <div className="flex items-center justify-between text-stone-700">
                    <span className="font-medium text-stone-900">Quantity:</span>
                    <span>{item.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-500 mt-1">
                    <span>Donor:</span>
                    <span>{item.donorName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{item.status}</span>
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentPage('resources')}
                >
                  Request Item
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Emergency Blood Urgent Alert Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 text-white p-6 sm:p-8 shadow-lg border border-emerald-800/60 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-900/70 text-rose-200 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span>Urgent Blood Requests Active</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
                Critical Need for Rare Negative Groups (O-, AB-, B-)
              </h3>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Emergency trauma and cardiac surgical units have posted verified urgent requests. Check our
                real-time blood bank inventory or register as a donor.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                variant="accent"
                size="md"
                onClick={() => setCurrentPage('blood-inventory')}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                <span>View Emergency Blood Board</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setCurrentPage('blood-banks')}
                className="bg-stone-800 text-white border-stone-700 hover:bg-stone-700"
              >
                Find Blood Banks
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Step-by-Step Redistribution Flow */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">
            Dignified & Accountable
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-teal-950 font-serif">
            How GiveConnect works
          </h2>
          <p className="text-sm text-stone-600 mt-2">
            A three-step verification and delivery process designed for total accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <div className="text-2xl font-bold text-teal-900 font-serif">01.</div>
            <h3 className="text-lg font-bold text-stone-900">List or Request Supplies</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Donors specify items, quantity, photos, and pickup location. Care homes and recipients list
              exact operational needs without financial overhead.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-2xl font-bold text-teal-900 font-serif">02.</div>
            <h3 className="text-lg font-bold text-stone-900">Verified Matching</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Our accreditation protocol ensures only vetted NGOs and genuine individuals receive critical
              supplies. Requests are matched based on locality and urgency.
            </p>
          </div>

          <div className="space-y-3">
            <div className="text-2xl font-bold text-teal-900 font-serif">03.</div>
            <h3 className="text-lg font-bold text-stone-900">Handover & Accountability</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Volunteers coordinate pickup and quality inspection. Handover receipts and photos are recorded
              so donors see the tangible impact of their generosity.
            </p>
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-stone-100 rounded-2xl border border-stone-200/80 p-8 sm:p-12 text-center max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl font-bold text-teal-950 font-serif">
            Ready to make a direct impact in your neighborhood?
          </h2>
          <p className="text-sm text-stone-600 max-w-xl mx-auto leading-relaxed">
            Whether you are donating surplus grains, volunteering on weekends, or registering your NGO,
            GiveConnect makes participation simple and transparent.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setCurrentPage('auth')}
              className="bg-teal-900 hover:bg-teal-800"
            >
              Register as Donor or Volunteer
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setCurrentPage('ngo-register')}
              className="border-stone-300 text-stone-800"
            >
              Register Your NGO / Ashram
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
