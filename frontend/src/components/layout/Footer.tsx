/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PageId } from '../../types';
import { HeartHandshake, PhoneCall, ShieldAlert, ArrowUpRight } from 'lucide-react';

export function Footer({ setCurrentPage }: { setCurrentPage: (page: PageId) => void }) {
  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-stone-900 text-stone-300 border-t border-stone-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Purpose */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-800 text-emerald-300 flex items-center justify-center">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-serif">
                Give<span className="text-emerald-400">Connect</span>
              </span>
            </div>
            <p className="text-sm text-stone-400 leading-relaxed max-w-md">
              A transparent resource redistribution network connecting donors with verified NGOs,
              ashrams, community shelters, blood banks, and volunteers. Built to eliminate waste and
              ensure dignified, equitable aid delivery.
            </p>
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800/80 border border-stone-700/60 text-xs text-stone-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Stage 1 Development: Client validation enabled · Demo sample directory</span>
              </div>
            </div>
          </div>

          {/* Redistribution Modules */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-white mb-4">
              Resources & Giving
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>
                <button
                  onClick={() => navigateTo('donate')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Donate Surplus Resources
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('resources')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Find Available Supplies
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('ngos')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Verified NGOs & Ashrams
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('ngo-register')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  NGO Accreditation Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Blood & Volunteer Corps */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-white mb-4">
              Emergency & Volunteers
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>
                <button
                  onClick={() => navigateTo('blood-inventory')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Live Blood Stock & Requests
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('blood-banks')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Blood Bank Directory
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('volunteers')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Volunteer Task Registry
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('supply-tracker')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left flex items-center gap-1.5 text-emerald-300 font-medium"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span>Live Supply Tracker (Swiggy)</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('auth')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left"
                >
                  Member Registration
                </button>
              </li>
            </ul>
          </div>

          {/* Dashboards & Governance */}
          <div>
            <h4 className="text-xs uppercase tracking-wider font-semibold text-white mb-4">
              Governance & Access
            </h4>
            <ul className="space-y-2.5 text-sm text-stone-400">
              <li>
                <button
                  onClick={() => navigateTo('user-dashboard')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left flex items-center gap-1"
                >
                  <span>User Portal</span>
                  <ArrowUpRight className="w-3 h-3 text-stone-500" />
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigateTo('admin-dashboard')}
                  className="hover:text-emerald-300 transition-colors cursor-pointer text-left flex items-center gap-1"
                >
                  <span>Admin Verification</span>
                  <ArrowUpRight className="w-3 h-3 text-stone-500" />
                </button>
              </li>
              <li className="pt-3">
                <div className="p-2.5 rounded-lg bg-teal-950/60 border border-teal-800/50 text-xs text-teal-200">
                  <div className="flex items-center gap-1.5 font-medium mb-1 text-emerald-400">
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>24x7 Blood Hotline</span>
                  </div>
                  <p className="font-mono text-white text-xs">1800-419-7000 (Toll Free)</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-stone-800 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} GiveConnect Network. All rights reserved.</p>
          <div className="flex items-center gap-4 text-stone-400">
            <span>Built with React & TypeScript</span>
            <span aria-hidden="true">·</span>
            <span>Zero Paid Dependencies</span>
            <span aria-hidden="true">·</span>
            <span>Community Data Safety</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
