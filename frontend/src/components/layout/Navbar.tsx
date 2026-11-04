/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PageId, UserRole } from '../../types';
import {
  HeartHandshake,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  User,
  PlusCircle,
  PackageSearch,
  Building2,
  Droplet,
  Users,
  LayoutDashboard,
  Lock,
  Sparkles,
  Database,
  Truck,
  LogOut,
  Layers,
  Heart,
} from 'lucide-react';
import { Button } from '../common/UIComponents';
import { AuthUser } from '../../services/apiService';

interface NavbarProps {
  currentPage: PageId;
  setCurrentPage: (page: PageId) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  authUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenDbManager?: () => void;
}

export function Navbar({
  currentPage,
  setCurrentPage,
  currentRole,
  setCurrentRole,
  authUser,
  onLogout,
  onOpenDbManager,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navigateTo = (page: PageId) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    setPagesDropdownOpen(false);
    setRoleDropdownOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const roleLabels: Record<string, string> = {
    donor: 'Donor',
    recipient: 'Recipient',
    ngo: 'NGO / Ashram',
    ngo_rep: 'NGO / Ashram',
    volunteer: 'Volunteer',
    blood_donor: 'Blood Donor',
    blood_bank: 'Blood Bank',
    blood_bank_officer: 'Blood Bank',
    admin: 'Administrator',
  };

  const allRolesList: { role: UserRole; label: string; icon: typeof HeartHandshake; targetPage: PageId }[] = [
    { role: 'donor', label: 'Donor', icon: HeartHandshake, targetPage: 'donate' },
    { role: 'recipient', label: 'Recipient', icon: PackageSearch, targetPage: 'resources' },
    { role: 'ngo', label: 'NGO / Ashram', icon: Building2, targetPage: 'ngos' },
    { role: 'volunteer', label: 'Volunteer', icon: Users, targetPage: 'volunteers' },
    { role: 'blood_donor', label: 'Blood Donor', icon: Heart, targetPage: 'blood-inventory' },
    { role: 'blood_bank', label: 'Blood Bank', icon: Droplet, targetPage: 'blood-inventory' },
    { role: 'admin', label: 'Administrator', icon: ShieldCheck, targetPage: 'admin-dashboard' },
  ];

  // If user is authenticated, determine their accessible roles
  const userAssignedRoles = authUser?.roles || ['donor'];
  const hasMultipleRoles = userAssignedRoles.length > 1;

  const allPagesList: { id: PageId; label: string; icon: typeof HeartHandshake }[] = [
    { id: 'home', label: '1. Home & Landing', icon: HeartHandshake },
    { id: 'auth', label: '2. Login & Registration', icon: Lock },
    { id: 'donate', label: '3. Donate Resources', icon: PlusCircle },
    { id: 'resources', label: '4. Find Available Resources', icon: PackageSearch },
    { id: 'ngos', label: '5. NGO & Ashram Directory', icon: Building2 },
    { id: 'ngo-register', label: '6. NGO Registration & Verification', icon: ShieldCheck },
    { id: 'blood-banks', label: '7. Blood Bank Directory', icon: Droplet },
    { id: 'blood-inventory', label: '8. Blood Inventory & Requests', icon: Droplet },
    { id: 'volunteers', label: '9. Volunteer Hub & Tasks', icon: Users },
    { id: 'user-dashboard', label: '10. User Dashboard', icon: User },
    { id: 'admin-dashboard', label: '11. Admin Dashboard', icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Vibrant Top Interface & Role Switcher Banner */}
      <div className="relative bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 text-white px-4 py-2 text-xs border-b border-emerald-800/40 shadow-xs overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 relative z-10">
          {/* Active User Status & Role */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {authUser ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs" />
                <span className="text-emerald-100 font-medium">
                  Signed in as <strong className="text-white">{authUser.name}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-200 font-semibold uppercase text-[10px]">
                  {roleLabels[currentRole] || currentRole}
                </span>
                {authUser.isVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300 font-semibold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/40">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
            ) : (
              <span className="text-emerald-100/90 text-[11px]">
                Viewing platform as{' '}
                <strong className="text-white uppercase font-bold underline decoration-emerald-400 underline-offset-2">
                  {roleLabels[currentRole] || currentRole}
                </strong>
              </span>
            )}

            {onOpenDbManager && (
              <button
                onClick={onOpenDbManager}
                title="Open Live Database Inspector & Automated Linkage Test Suite"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-400/20 hover:bg-emerald-400/35 border border-emerald-400/40 text-emerald-100 text-[11px] font-semibold transition-all cursor-pointer shadow-xs ml-1"
              >
                <Database className="w-3 h-3 text-emerald-300" />
                <span>DB Inspector & Test Suite</span>
              </button>
            )}
          </div>

          {/* Interactive Role Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-0.5 scrollbar-none">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80 mr-1 hidden lg:inline">
              {hasMultipleRoles ? 'Switch Assigned Role:' : 'Switch Perspective:'}
            </span>

            <div className="inline-flex items-center bg-teal-950/70 p-1 rounded-xl border border-emerald-500/25 backdrop-blur-md shadow-inner">
              {allRolesList
                .filter((item) => !authUser || authUser.roles.includes('admin') || userAssignedRoles.includes(item.role))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = currentRole === item.role;
                  return (
                    <button
                      key={item.role}
                      onClick={() => {
                        setCurrentRole(item.role);
                        if (item.role === 'admin') {
                          navigateTo('admin-dashboard');
                        } else if (currentPage === 'admin-dashboard') {
                          navigateTo('user-dashboard');
                        }
                      }}
                      title={`Switch active perspective to ${item.label}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all duration-200 whitespace-nowrap cursor-pointer select-none ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-200 text-teal-950 font-bold shadow-md shadow-emerald-500/25 scale-[1.02]'
                          : 'text-emerald-100/80 hover:text-white hover:bg-emerald-800/40'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-950' : 'text-emerald-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
            </div>

            {authUser && onLogout && (
              <button
                onClick={onLogout}
                title="Sign out of your session"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/30 text-rose-200 text-[11px] font-medium transition-all cursor-pointer"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Top Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-18">
          {/* Brand Logo */}
          <button
            onClick={() => navigateTo('home')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-900 text-emerald-400 flex items-center justify-center shadow-xs group-hover:bg-teal-800 transition-colors">
              <HeartHandshake className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-teal-950 font-serif">
                Give<span className="text-emerald-700">Connect</span>
              </span>
              <span className="sr-only">Home</span>
            </div>
          </button>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-stone-700">
            <button
              onClick={() => navigateTo('donate')}
              className={`hover:text-teal-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'donate' ? 'text-teal-900 font-semibold underline underline-offset-8 decoration-teal-700' : ''
              }`}
            >
              Donate Resources
            </button>
            <button
              onClick={() => navigateTo('resources')}
              className={`hover:text-teal-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'resources' ? 'text-teal-900 font-semibold underline underline-offset-8 decoration-teal-700' : ''
              }`}
            >
              Find Resources
            </button>
            <button
              onClick={() => navigateTo('ngos')}
              className={`hover:text-teal-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'ngos' ? 'text-teal-900 font-semibold underline underline-offset-8 decoration-teal-700' : ''
              }`}
            >
              NGOs & Ashrams
            </button>
            <button
              onClick={() => navigateTo('blood-inventory')}
              className={`hover:text-teal-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'blood-inventory' || currentPage === 'blood-banks'
                  ? 'text-teal-900 font-semibold underline underline-offset-8 decoration-teal-700'
                  : ''
              }`}
            >
              Blood Emergency
            </button>
            <button
              onClick={() => navigateTo('volunteers')}
              className={`hover:text-teal-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                currentPage === 'volunteers' ? 'text-teal-900 font-semibold underline underline-offset-8 decoration-teal-700' : ''
              }`}
            >
              Volunteer Hub
            </button>

            {/* All Portals Menu */}
            <div className="relative">
              <button
                onClick={() => setPagesDropdownOpen(!pagesDropdownOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/60 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Modules</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    pagesDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {pagesDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-200/90 py-2.5 z-50 animate-in fade-in slide-in-from-top-1"
                  onMouseLeave={() => setPagesDropdownOpen(false)}
                >
                  <div className="px-3.5 py-1.5 flex items-center justify-between border-b border-stone-100">
                    <span className="text-[11px] font-bold text-teal-950 uppercase tracking-wider">
                      Module Navigator
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                      MongoDB persistence
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-1.5 space-y-1">
                    {allPagesList.map((item) => {
                      const Icon = item.icon;
                      const isCurrent = currentPage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => navigateTo(item.id)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-xl flex items-center gap-2.5 transition-all cursor-pointer ${
                            isCurrent
                              ? 'text-teal-950 font-bold bg-gradient-to-r from-emerald-100/80 to-teal-50 border border-emerald-200'
                              : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isCurrent ? 'bg-teal-900 text-emerald-300' : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {currentRole === 'admin' ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigateTo('admin-dashboard')}
                className="gap-1.5 bg-indigo-950 hover:bg-indigo-900"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Console</span>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateTo('user-dashboard')}
                  className="text-stone-700 gap-1.5"
                >
                  <User className="w-4 h-4 text-stone-500" />
                  <span>My Dashboard</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigateTo('donate')}
                  className="bg-teal-900 hover:bg-teal-800"
                >
                  Donate Now
                </Button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => navigateTo('user-dashboard')}
              className="text-xs bg-teal-900 text-white px-3 py-1.5 rounded-lg font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-stone-700 hover:text-stone-900 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-stone-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
            All Platform Portals
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {allPagesList.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                    currentPage === item.id ? 'bg-teal-900 text-white font-medium' : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {authUser && onLogout && (
            <div className="pt-3 border-t border-stone-200">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out ({authUser.email})</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
