/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PageId, UserRole } from '../types';
import { Button, Card } from '../components/common/UIComponents';
import {
  Lock,
  Mail,
  User,
  Phone,
  MapPin,
  Building,
  ShieldCheck,
  ArrowRight,
  Heart,
  Droplet,
  Users,
  Package,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { apiService, AuthUser } from '../services/apiService';

interface AuthPageProps {
  setCurrentPage: (page: PageId) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  onAuthSuccess?: (user: AuthUser) => void;
}

export function AuthPage({
  setCurrentPage,
  currentRole,
  setCurrentRole,
  onAuthSuccess,
}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('donor');
  const [legalType, setLegalType] = useState<'Trust' | 'Society' | 'Section 8 Company'>('Trust');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    city: 'Bengaluru',
    organizationName: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: 'admin' as UserRole,
      title: 'Administrator',
      email: 'admin@giveconnect.org',
      icon: ShieldCheck,
      color: 'bg-indigo-900 text-white hover:bg-indigo-800',
      desc: 'Verify NGOs, review documents, oversee all platform activities',
    },
    {
      role: 'donor' as UserRole,
      title: 'Resource Donor',
      email: 'donor@giveconnect.org',
      icon: Heart,
      color: 'bg-emerald-800 text-white hover:bg-emerald-700',
      desc: 'Post surplus food, medicines, wheelchairs, track handovers',
    },
    {
      role: 'recipient' as UserRole,
      title: 'Recipient / Community',
      email: 'recipient@giveconnect.org',
      icon: Package,
      color: 'bg-teal-800 text-white hover:bg-teal-700',
      desc: 'Browse supplies, submit resource requests, receive aid',
    },
    {
      role: 'ngo' as UserRole,
      title: 'NGO (Pending Audit)',
      email: 'ngo.pending@giveconnect.org',
      icon: Building,
      color: 'bg-amber-800 text-white hover:bg-amber-700',
      desc: 'Upload certificates, view pending status or rejection reasons',
    },
    {
      role: 'ngo' as UserRole,
      title: 'NGO (Verified)',
      email: 'ngo.verified@giveconnect.org',
      icon: ShieldCheck,
      color: 'bg-teal-900 text-white hover:bg-teal-800',
      desc: 'Claim donations, coordinate deliveries, verified public profile',
    },
    {
      role: 'volunteer' as UserRole,
      title: 'Volunteer Champion',
      email: 'volunteer@giveconnect.org',
      icon: Users,
      color: 'bg-cyan-900 text-white hover:bg-cyan-800',
      desc: 'Assigned deliveries, update transit status, verify OTP pin',
    },
    {
      role: 'blood_donor' as UserRole,
      title: 'Voluntary Blood Donor',
      email: 'blooddonor@giveconnect.org',
      icon: Droplet,
      color: 'bg-rose-800 text-white hover:bg-rose-700',
      desc: 'Pledge units for critical emergency surgery requests',
    },
    {
      role: 'blood_bank' as UserRole,
      title: 'Blood Bank Officer',
      email: 'bloodbank@giveconnect.org',
      icon: Droplet,
      color: 'bg-red-900 text-white hover:bg-red-800',
      desc: 'Manage blood stock inventory matrix across all groups',
    },
    {
      role: 'donor' as UserRole,
      title: 'Multi-Role User',
      email: 'multirole@giveconnect.org',
      icon: Layers,
      color: 'bg-purple-900 text-white hover:bg-purple-800',
      desc: 'Account with multiple roles (Donor + Volunteer + Blood Donor)',
    },
  ];

  const handleQuickLogin = async (email: string) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await apiService.login(email, 'password123');
      setCurrentRole(res.user.activeRole);
      onAuthSuccess?.(res.user);

      if (res.user.activeRole === 'admin') {
        setCurrentPage('admin-dashboard');
      } else {
        setCurrentPage('user-dashboard');
      }
    } catch (err: any) {
      setApiError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = 'Please provide a valid email address.';
    }
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }
    if (mode === 'register') {
      if (!formData.name.trim()) {
        newErrors.name = 'Full name is required.';
      }
      if (!formData.phone.trim() || formData.phone.length < 10) {
        newErrors.phone = 'Valid 10-digit phone number is required.';
      }
      if ((selectedRole === 'ngo' || selectedRole === 'blood_bank') && !formData.organizationName.trim()) {
        newErrors.organizationName = 'Organization / Facility name is required.';
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setApiError(null);

    try {
      if (mode === 'login') {
        const res = await apiService.login(formData.email, formData.password);
        setCurrentRole(res.user.activeRole);
        onAuthSuccess?.(res.user);

        if (res.user.activeRole === 'admin') {
          setCurrentPage('admin-dashboard');
        } else {
          setCurrentPage('user-dashboard');
        }
      } else {
        const res = await apiService.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          city: formData.city,
          role: selectedRole,
          roles: [selectedRole],
          organizationName: formData.organizationName,
          legalType: selectedRole === 'ngo' ? legalType : undefined,
        });

        setCurrentRole(res.user.activeRole);
        onAuthSuccess?.(res.user);

        if (selectedRole === 'ngo') {
          setCurrentPage('ngo-register');
        } else if (res.user.activeRole === 'admin') {
          setCurrentPage('admin-dashboard');
        } else {
          setCurrentPage('user-dashboard');
        }
      }
    } catch (err: any) {
      setApiError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold">
          <KeyRound className="w-3.5 h-3.5 text-teal-700" />
          <span>Real JWT Authentication & Persistent Session</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
          {mode === 'login' ? 'Sign In to GiveConnect' : 'Create Your GiveConnect Account'}
        </h1>
        <p className="text-sm text-stone-600 max-w-lg mx-auto">
          Role-protected portal for donors, recipient communities, verified NGOs, blood donors, and volunteers.
        </p>
      </div>

      {/* 1-Click Quick Demo Login for Reviewers & Testing */}
      <Card className="p-5 border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-stone-50 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-teal-950">
              1-Click Demo Testing Accounts (All 7 Roles Seeded)
            </h2>
          </div>
          <span className="text-[11px] text-stone-500 hidden sm:inline">
            Real bcrypt credentials pre-loaded
          </span>
        </div>
        <p className="text-xs text-stone-600 mb-4">
          Click any button below to instantly authenticate via JWT with that exact role and test its dedicated dashboard:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {demoAccounts.map((acc, idx) => {
            const Icon = acc.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickLogin(acc.email)}
                disabled={loading}
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border border-stone-300/80 text-left transition-all cursor-pointer shadow-xs ${acc.color}`}
              >
                <div className="p-1.5 rounded-md bg-white/20 shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold tracking-tight truncate">{acc.title}</div>
                  <div className="text-[10px] opacity-80 font-mono truncate">{acc.email}</div>
                  <div className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{acc.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Auth Form Container */}
      <div className="max-w-xl mx-auto">
        <Card className="p-6 sm:p-8 border-stone-200 shadow-sm">
          {/* Segmented Mode Switcher */}
          <div className="flex rounded-lg bg-stone-100 p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrors({});
                setApiError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'login' ? 'bg-white text-teal-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Sign In with Email
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrors({});
                setApiError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                mode === 'register' ? 'bg-white text-teal-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Register New Account
            </button>
          </div>

          {apiError && (
            <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Choose Your Account Role
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { role: 'donor' as UserRole, label: 'Resource Donor', icon: Heart },
                    { role: 'recipient' as UserRole, label: 'Recipient / Care', icon: Package },
                    { role: 'ngo' as UserRole, label: 'NGO / Ashram', icon: Building },
                    { role: 'volunteer' as UserRole, label: 'Volunteer', icon: Users },
                    { role: 'blood_donor' as UserRole, label: 'Blood Donor', icon: Droplet },
                    { role: 'blood_bank' as UserRole, label: 'Blood Bank', icon: Droplet },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setSelectedRole(item.role)}
                        className={`p-2.5 text-left rounded-lg border text-xs font-medium transition-all cursor-pointer flex items-center gap-2 ${
                          selectedRole === item.role
                            ? 'border-teal-900 bg-teal-50 text-teal-950 font-bold shadow-xs'
                            : 'border-stone-200 text-stone-600 hover:border-stone-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0 text-teal-800" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {mode === 'register' && selectedRole === 'ngo' && (
              <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200 space-y-2">
                <label className="block text-xs font-semibold text-amber-950">
                  Legal Organization Structure
                </label>
                <p className="text-[11px] text-stone-600">
                  NGOs must be legally registered. Verification certificates will be reviewed by admin before verified status is granted.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['Trust', 'Society', 'Section 8 Company'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setLegalType(t)}
                      className={`py-1.5 px-2 text-xs rounded border text-center transition-all cursor-pointer ${
                        legalType === t
                          ? 'bg-amber-900 text-white font-semibold border-amber-950'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Full Name / Authorized Signatory
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Aditi Deshmukh"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                  />
                </div>
                {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@example.org"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
              {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
              {errors.password && <p className="text-xs text-rose-600 mt-1">{errors.password}</p>}
            </div>

            {mode === 'register' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 98450 00000"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>
                    {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      City
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. Bengaluru, Mysuru"
                        className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>
                  </div>
                </div>

                {(selectedRole === 'ngo' || selectedRole === 'blood_bank') && (
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      {selectedRole === 'ngo' ? 'Official NGO / Ashram Name' : 'Blood Bank Center Name'}
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={formData.organizationName}
                        onChange={(e) =>
                          setFormData({ ...formData, organizationName: e.target.value })
                        }
                        placeholder={
                          selectedRole === 'ngo'
                            ? 'e.g. Sneha Sanjeevani Eldercare Trust'
                            : 'e.g. Victoria Hospital Regional Blood Centre'
                        }
                        className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                      />
                    </div>
                    {errors.organizationName && (
                      <p className="text-xs text-rose-600 mt-1">{errors.organizationName}</p>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                disabled={loading}
                className="bg-teal-900 hover:bg-teal-800"
              >
                {loading
                  ? 'Authenticating...'
                  : mode === 'login'
                  ? 'Sign In with Email'
                  : 'Complete Registration & Enter'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
