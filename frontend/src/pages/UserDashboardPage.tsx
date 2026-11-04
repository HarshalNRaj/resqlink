/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  PageId,
  UserRole,
  ResourceItem,
  HandoverRequest,
  BloodDonationPledge,
  VolunteerTask,
  BloodGroup,
} from '../types';
import { Button, Card, Modal } from '../components/common/UIComponents';
import { PlatformAlert } from '../services/storageService';
import {
  User,
  ShieldCheck,
  Package,
  Heart,
  Droplet,
  Users,
  PlusCircle,
  Clock,
  ArrowRight,
  Bell,
  CheckCircle2,
  Calendar,
  MapPin,
  Phone,
  Check,
  X,
  FileText,
  Database,
  Truck,
  Building2,
  AlertTriangle,
  KeyRound,
  RefreshCw,
  Edit,
  Save,
  Trash2,
} from 'lucide-react';
import { apiService, AuthUser, VolunteerMission, BloodStockItem, NgoDossier } from '../services/apiService';

interface UserDashboardPageProps {
  setCurrentPage: (page: PageId) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  resources?: ResourceItem[];
  alerts?: PlatformAlert[];
  userShifts?: string[];
  handoverRequests?: HandoverRequest[];
  bloodPledges?: BloodDonationPledge[];
  volunteerTasks?: VolunteerTask[];
  onUpdateResource?: (item: ResourceItem) => void;
  onDeleteResource?: (id: string) => void;
  onCompleteHandover?: (requestId: string, resourceId: string) => void;
  onCancelShift?: (taskId: string) => void;
  onOpenDbManager?: () => void;
  onTrackSupplyRun?: () => void;
}

export function UserDashboardPage({
  setCurrentPage,
  currentRole,
  setCurrentRole,
  resources: propResources = [],
  alerts: propAlerts = [],
  userShifts = [],
  handoverRequests = [],
  bloodPledges = [],
  volunteerTasks = [],
  onUpdateResource,
  onDeleteResource,
  onCompleteHandover,
  onCancelShift,
  onOpenDbManager,
}: UserDashboardPageProps) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => apiService.getCurrentUser());

  // Role-specific data
  const [ngoDossier, setNgoDossier] = useState<NgoDossier | null>(null);
  const [volunteerMissions, setVolunteerMissions] = useState<VolunteerMission[]>([]);
  const [bloodInventory, setBloodInventory] = useState<BloodStockItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Volunteer OTP Verification Modal
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [activeMission, setActiveMission] = useState<VolunteerMission | null>(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);

  // Blood Bank stock editing
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editUnits, setEditUnits] = useState<number>(0);

  // NGO Claim Modal State
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedResourceToClaim, setSelectedResourceToClaim] = useState<ResourceItem | null>(null);
  const [claimForm, setClaimForm] = useState({
    organizationName: '',
    purpose: 'Daily nutritional support for 65 elder residents',
    beneficiaryCount: '65',
    requestedQuantity: 'Full Consignment',
    urgency: 'Standard',
    fulfillmentMode: 'Volunteer Delivery',
    notes: '',
  });
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);
  const [donationCategoryFilter, setDonationCategoryFilter] = useState<string>('all');
  const [donationSearch, setDonationSearch] = useState<string>('');
  const [myDonations, setMyDonations] = useState<ResourceItem[]>([]);
  const [myDonationsError, setMyDonationsError] = useState<string | null>(null);
  const [loadingMyDonations, setLoadingMyDonations] = useState(false);
  const [editingDonation, setEditingDonation] = useState<ResourceItem | null>(null);
  const [donationEditForm, setDonationEditForm] = useState({
    title: '',
    category: '',
    quantity: '',
    condition: 'Good Condition' as ResourceItem['condition'],
    city: '',
    locality: '',
    description: '',
    pickupAvailable: true,
  });
  const [donationActionError, setDonationActionError] = useState<string | null>(null);
  const [savingDonation, setSavingDonation] = useState(false);

  useEffect(() => {
    if (currentRole !== 'donor') {
      setMyDonations([]);
      setMyDonationsError(null);
      setLoadingMyDonations(false);
      return;
    }

    let active = true;
    setLoadingMyDonations(true);
    apiService.getMyResources()
      .then((items) => {
        if (active) {
          setMyDonations(items);
          setMyDonationsError(null);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setMyDonationsError(error instanceof Error ? error.message : 'Unable to load your donations.');
        }
      })
      .finally(() => {
        if (active) setLoadingMyDonations(false);
      });

    return () => {
      active = false;
    };
  }, [currentRole]);

  const openDonationEditor = (item: ResourceItem) => {
    setEditingDonation(item);
    setDonationEditForm({
      title: item.title,
      category: item.categoryLabel || item.category,
      quantity: item.quantity,
      condition: item.condition,
      city: item.city,
      locality: item.locality || '',
      description: item.description || '',
      pickupAvailable: item.pickupAvailable,
    });
    setDonationActionError(null);
  };

  const handleSaveDonation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingDonation) return;
    setSavingDonation(true);
    setDonationActionError(null);
    try {
      const { item } = await apiService.updateResource(editingDonation.id, {
        title: donationEditForm.title.trim(),
        category: donationEditForm.category as ResourceItem['category'],
        categoryLabel: donationEditForm.category,
        quantity: donationEditForm.quantity.trim(),
        condition: donationEditForm.condition,
        city: donationEditForm.city.trim(),
        locality: donationEditForm.locality.trim(),
        description: donationEditForm.description.trim(),
        pickupAvailable: donationEditForm.pickupAvailable,
      });
      setMyDonations((current) => current.map((resource) => resource.id === item.id ? item : resource));
      onUpdateResource?.(item);
      setEditingDonation(null);
    } catch (error) {
      setDonationActionError(error instanceof Error ? error.message : 'Unable to update this donation.');
    } finally {
      setSavingDonation(false);
    }
  };

  const handleDeleteDonation = async (item: ResourceItem) => {
    if (!window.confirm(`Delete "${item.title}" from your donations? This cannot be undone.`)) return;
    setDonationActionError(null);
    try {
      await apiService.deleteResource(item.id);
      setMyDonations((current) => current.filter((resource) => resource.id !== item.id));
      onDeleteResource?.(item.id);
    } catch (error) {
      setDonationActionError(error instanceof Error ? error.message : 'Unable to delete this donation.');
    }
  };

  const handleOpenClaimModal = (item: ResourceItem) => {
    setSelectedResourceToClaim(item);
    setClaimForm((prev) => ({
      ...prev,
      organizationName: ngoDossier?.name || currentUser?.organizationName || 'Karuna Vridhashram & Child Haven',
      requestedQuantity: item.quantity,
    }));
    setClaimSuccessMsg(null);
    setClaimModalOpen(true);
  };

  const handleConfirmNgoClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResourceToClaim) return;

    const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();
    const newHandover: HandoverRequest = {
      id: `req-${Date.now().toString().slice(-4)}`,
      resourceId: selectedResourceToClaim.id,
      resourceTitle: selectedResourceToClaim.title,
      requesterName: claimForm.organizationName,
      organization: claimForm.organizationName,
      phone: currentUser?.phone || '+91 98450 22334',
      beneficiaryCount: parseInt(claimForm.beneficiaryCount, 10) || 50,
      purpose: `${claimForm.purpose} (Quantity: ${claimForm.requestedQuantity})`,
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'Handover Scheduled',
      donorName: selectedResourceToClaim.donorName,
      donorPhone: selectedResourceToClaim.contactPhone,
      imageUrl: selectedResourceToClaim.imageUrl,
      deliveryPin: deliveryPin,
    };

    try {
      await apiService.createHandoverRequest({
        id: newHandover.id,
        resourceId: newHandover.resourceId,
        resourceTitle: newHandover.resourceTitle,
        requesterId: currentUser?.id,
        requesterName: newHandover.requesterName,
        requesterType: newHandover.organization,
        requesterPhone: newHandover.phone,
        purpose: newHandover.purpose,
        requestDate: newHandover.requestedDate,
        status: newHandover.status,
      });
    } catch (err) {
      console.warn('Backend claim handover notice:', err);
    }

    selectedResourceToClaim.status = 'Reserved';
    handoverRequests.unshift(newHandover);

    setClaimSuccessMsg(`Successfully claimed "${selectedResourceToClaim.title}"! Delivery Handover PIN: ${deliveryPin}`);
    setTimeout(() => {
      setClaimModalOpen(false);
      setActiveTab('claimed_resources');
    }, 1200);
  };

  // Dynamic tab based on role
  const getDefaultTab = (role: UserRole) => {
    switch (role) {
      case 'donor':
        return 'donations';
      case 'recipient':
        return 'requests';
      case 'ngo':
        return 'available_donations';
      case 'volunteer':
        return 'missions';
      case 'blood_donor':
        return 'blood_sos';
      case 'blood_bank':
        return 'blood_inventory';
      default:
        return 'donations';
    }
  };

  const [activeTab, setActiveTab] = useState<string>(() => getDefaultTab(currentRole));

  useEffect(() => {
    setActiveTab(getDefaultTab(currentRole));
  }, [currentRole]);

  // Load backend role data
  useEffect(() => {
    const loadRoleData = async () => {
      setLoading(true);
      try {
        if (currentRole === 'ngo') {
          const ngoRes = await apiService.getNgoStatus();
          setNgoDossier(ngoRes.profile);
        } else if (currentRole === 'volunteer') {
          const vRes = await apiService.getVolunteerMissions();
          setVolunteerMissions(vRes.missions);
        } else if (currentRole === 'blood_bank') {
          const bbRes = await apiService.getBloodInventory();
          setBloodInventory(bbRes.inventory);
        }
      } catch (err) {
        console.error('Failed to load dashboard role data', err);
      } finally {
        setLoading(false);
      }
    };

    loadRoleData();
  }, [currentRole]);

  // Handle Volunteer OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMission) return;
    if (!enteredOtp.trim()) {
      setOtpError('Please enter the recipient handover OTP PIN.');
      return;
    }

    setOtpError(null);
    setOtpSuccess(null);
    try {
      const res = await apiService.verifyDeliveryOtp(
        activeMission.id,
        enteredOtp.trim(),
        receiverName || 'Authorized Receiver',
        deliveryNotes
      );
      setOtpSuccess(res.message);
      // Reload missions
      const vRes = await apiService.getVolunteerMissions();
      setVolunteerMissions(vRes.missions);
      setTimeout(() => {
        setOtpModalOpen(false);
        setActiveMission(null);
        setEnteredOtp('');
        setReceiverName('');
        setDeliveryNotes('');
      }, 1500);
    } catch (err: any) {
      setOtpError(err.message || 'OTP Verification failed.');
    }
  };

  // Handle Blood Bank stock update
  const handleSaveStock = async (item: BloodStockItem) => {
    try {
      await apiService.updateBloodStock(item.bloodBankId, item.bloodGroup, editUnits);
      const bbRes = await apiService.getBloodInventory();
      setBloodInventory(bbRes.inventory);
      setEditingStockId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update stock');
    }
  };

  const displayName = currentUser?.name || 'Community Member';
  const displayEmail = currentUser?.email || 'user@giveconnect.org';
  const displayCity = currentUser?.city || 'Bengaluru';
  const displayOrg = currentUser?.organizationName;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-900 text-emerald-300 flex items-center justify-center text-2xl font-bold font-serif shadow-xs">
              {displayName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif">
                  {displayName}
                </h1>
                <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-900 border border-teal-200">
                  Role: {currentRole.replace('_', ' ')}
                </span>
                {currentUser?.isVerified && (
                  <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                {displayEmail} · {displayCity}
              </p>
              {displayOrg && (
                <p className="text-xs font-semibold text-teal-900">
                  Affiliation: {displayOrg}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {currentRole === 'donor' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage('donate')}
                className="bg-teal-900 hover:bg-teal-800 shadow-xs"
              >
                <PlusCircle className="w-4 h-4 mr-1.5" />
                <span>Post New Donation</span>
              </Button>
            )}

            {currentRole === 'recipient' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage('resources')}
                className="bg-teal-900 hover:bg-teal-800 shadow-xs"
              >
                <Package className="w-4 h-4 mr-1.5" />
                <span>Browse Available Resources</span>
              </Button>
            )}

            {currentRole === 'ngo' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage('ngo-register')}
                className="bg-teal-900 hover:bg-teal-800 shadow-xs"
              >
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                <span>Upload Verification Certificates</span>
              </Button>
            )}

            {currentRole === 'admin' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentPage('admin-dashboard')}
                className="bg-indigo-950 hover:bg-indigo-900 shadow-xs"
              >
                <span>Open Admin Governance Console</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            )}

            {onOpenDbManager && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenDbManager}
                className="border-emerald-700 text-emerald-800 hover:bg-emerald-50 gap-1.5"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span>DB Inspector</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-stone-200 gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('donations')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'donations'
              ? 'border-teal-900 text-teal-950 font-bold bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Donations & Resources ({propResources.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'requests'
              ? 'border-teal-900 text-teal-950 font-bold bg-white'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Resource Requests ({handoverRequests.length})</span>
        </button>

        {currentRole === 'ngo' && (
          <>
            <button
              onClick={() => setActiveTab('available_donations')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'available_donations'
                  ? 'border-teal-900 text-teal-950 font-bold bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-emerald-700" />
              <span>Available Donor Donations to Claim ({propResources.filter((r) => r.status === 'Available').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('claimed_resources')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'claimed_resources'
                  ? 'border-teal-900 text-teal-950 font-bold bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-700" />
              <span>Our Claimed Donations & Handover ({handoverRequests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ngo_status')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ngo_status'
                  ? 'border-teal-900 text-teal-950 font-bold bg-white'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Ashram / NGO Accreditation Dossier</span>
            </button>
          </>
        )}

        {(currentRole === 'volunteer' || volunteerMissions.length > 0) && (
          <button
            onClick={() => setActiveTab('missions')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'missions'
                ? 'border-teal-900 text-teal-950 font-bold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Assigned Missions & OTP Verification ({volunteerMissions.length})</span>
          </button>
        )}

        {(currentRole === 'blood_donor' || bloodPledges.length > 0) && (
          <button
            onClick={() => setActiveTab('blood_sos')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'blood_sos'
                ? 'border-teal-900 text-teal-950 font-bold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Blood Donor Pledges ({bloodPledges.length})</span>
          </button>
        )}

        {currentRole === 'blood_bank' && (
          <button
            onClick={() => setActiveTab('blood_inventory')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'blood_inventory'
                ? 'border-teal-900 text-teal-950 font-bold bg-white'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>Blood Stock Inventory Matrix</span>
          </button>
        )}
      </div>

      {/* Main Tab Views Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Role Details */}
        <div className="lg:col-span-8 space-y-4">
          {/* TAB: Available Donor Donations for NGOs/Ashrams */}
          {activeTab === 'available_donations' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-900 via-teal-800 to-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                      Ashram & NGO Portal
                    </span>
                    <span className="text-xs text-stone-300">Live Resource Redistribution</span>
                  </div>
                  <h3 className="text-lg font-bold font-serif text-white">Available Donor Consignments</h3>
                  <p className="text-xs text-stone-300 max-w-xl">
                    Donations submitted by verified community donors. Claim surplus rations, medical items, and educational kits tailored to your sanctuary residents.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-bold font-serif text-emerald-400">
                    {propResources.filter((r) => r.status === 'Available').length}
                  </span>
                  <span className="block text-[11px] text-stone-300">Available to Claim</span>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  {['all', 'Food', 'Medical', 'Clothing', 'Educational', 'Household', 'Provisions'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDonationCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                        donationCategoryFilter === cat
                          ? 'bg-teal-900 text-white'
                          : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200'
                      }`}
                    >
                      {cat === 'all' ? 'All Donations' : cat}
                    </button>
                  ))}
                </div>

                <div className="sm:w-64">
                  <input
                    type="text"
                    value={donationSearch}
                    onChange={(e) => setDonationSearch(e.target.value)}
                    placeholder="Search title, locality or city..."
                    className="w-full px-3 py-1.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
                  />
                </div>
              </div>

              {/* Donations Grid */}
              {(() => {
                const available = propResources.filter((r) => {
                  const matchesStatus = r.status === 'Available';
                  const matchesCat =
                    donationCategoryFilter === 'all' ||
                    r.category.toLowerCase() === donationCategoryFilter.toLowerCase();
                  const matchesSearch =
                    !donationSearch ||
                    r.title.toLowerCase().includes(donationSearch.toLowerCase()) ||
                    r.locality.toLowerCase().includes(donationSearch.toLowerCase()) ||
                    r.city.toLowerCase().includes(donationSearch.toLowerCase()) ||
                    r.donorName.toLowerCase().includes(donationSearch.toLowerCase());
                  return matchesStatus && matchesCat && matchesSearch;
                });

                if (available.length === 0) {
                  return (
                    <Card className="text-center py-12 border-stone-200 space-y-3">
                      <Package className="w-10 h-10 text-stone-300 mx-auto" />
                      <h4 className="text-sm font-bold text-stone-700">No matching donations available</h4>
                      <p className="text-xs text-stone-500 max-w-sm mx-auto">
                        There are currently no available items in this category. As donors submit surplus rations and goods, they will appear here instantly.
                      </p>
                    </Card>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {available.map((r) => (
                      <Card key={r.id} className="p-4 flex flex-col justify-between border-stone-200 hover:border-teal-700/40 transition-all">
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-teal-100 text-teal-900 border border-teal-200">
                              {r.category}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {r.condition}
                            </span>
                          </div>

                          {r.imageUrl && (
                            <img
                              src={r.imageUrl}
                              alt={r.title}
                              className="w-full h-32 object-cover rounded-lg border border-stone-200"
                            />
                          )}

                          <div>
                            <h4 className="font-bold text-sm text-stone-900">{r.title}</h4>
                            <p className="text-xs text-stone-600 mt-0.5">
                              Quantity: <strong className="text-stone-900">{r.quantity}</strong>
                            </p>
                            {r.expiryOrUrgency && (
                              <p className="text-[11px] text-amber-800 font-medium">
                                Urgency / Window: {r.expiryOrUrgency}
                              </p>
                            )}
                          </div>

                          <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100 text-[11px] space-y-1">
                            <div className="flex items-center gap-1.5 text-stone-600">
                              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">{r.locality}, {r.city}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-stone-600">
                              <User className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                              <span className="truncate">Donor: {r.donorName}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-3 mt-3 border-t border-stone-100 flex items-center justify-between">
                          <span className="text-[11px] text-stone-400">Ready for claim</span>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleOpenClaimModal(r)}
                            className="bg-teal-900 hover:bg-teal-800 text-white text-xs gap-1.5"
                          >
                            <Heart className="w-3.5 h-3.5 text-teal-300" />
                            <span>Claim for Our Ashram / NGO</span>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: Claimed Donations & Handover Manifest */}
          {activeTab === 'claimed_resources' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
                <div>
                  <h3 className="text-base font-bold font-serif">Our Ashram / NGO Handover Manifest</h3>
                  <p className="text-xs text-emerald-800">
                    Review assigned consignments, monitor dispatch status, and provide the 4-digit Recipient OTP PIN to the volunteer upon physical arrival.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentPage('supply-tracker')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs shrink-0 gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track Deliveries Live (Swiggy Tracker)</span>
                </Button>
              </div>

              {handoverRequests.length === 0 ? (
                <Card className="text-center py-10 border-stone-200 space-y-3">
                  <FileText className="w-10 h-10 text-stone-300 mx-auto" />
                  <h4 className="text-sm font-bold text-stone-700">No active handover claims yet</h4>
                  <p className="text-xs text-stone-500 max-w-sm mx-auto">
                    Switch to the "Available Donor Donations" tab to browse surplus consignments and claim them directly for your sanctuary residents.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('available_donations')}
                    className="text-xs border-teal-800 text-teal-950"
                  >
                    <span>Browse Available Donations</span>
                  </Button>
                </Card>
              ) : (
                <div className="space-y-3">
                  {handoverRequests.map((req) => (
                    <Card key={req.id} className="p-5 space-y-3 border-stone-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900">
                              {req.status}
                            </span>
                            <span className="text-xs text-stone-400 font-mono">Ref: {req.id}</span>
                          </div>
                          <h4 className="text-base font-bold text-stone-900">{req.resourceTitle}</h4>
                          <p className="text-xs text-stone-600 mt-0.5">
                            Beneficiaries Supported: <strong className="text-stone-900">{req.beneficiaryCount || 65} individuals</strong> · {req.purpose}
                          </p>
                        </div>

                        {/* Recipient OTP PIN */}
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center shrink-0">
                          <span className="text-[10px] text-amber-800 font-semibold uppercase block">
                            Recipient Handover OTP PIN
                          </span>
                          <span className="font-mono font-bold text-lg text-amber-950 tracking-widest">
                            {req.deliveryPin || '4921'}
                          </span>
                          <span className="text-[9px] text-amber-700 block mt-0.5">
                            Share with volunteer at delivery gate
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1">
                          <span className="text-stone-500 font-semibold block flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-stone-400" />
                            <span>Donor Contact:</span>
                          </span>
                          <p className="font-bold text-stone-900">{req.donorName || 'Verified Donor'}</p>
                          {req.donorPhone && <p className="text-teal-900 font-mono">{req.donorPhone}</p>}
                        </div>

                        <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1">
                          <span className="text-stone-500 font-semibold block flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Claiming Sanctuary:</span>
                          </span>
                          <p className="font-bold text-stone-900">{req.organization || req.requesterName}</p>
                          <p className="text-stone-600">{req.phone || '+91 98450 22334'}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                        <span className="text-xs text-stone-500">
                          Fulfillment Mode: <strong className="text-stone-800">Volunteer Doorstep Delivery</strong>
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage('supply-tracker')}
                          className="border-teal-800 text-teal-950 text-xs gap-1.5"
                        >
                          <Truck className="w-3.5 h-3.5 text-teal-700" />
                          <span>Track Dispatch Vehicle</span>
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: NGO Accreditation & Status */}
          {activeTab === 'ngo_status' && (
            <div className="space-y-4">
              <Card className="p-6 border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
                  <div>
                    <span className="text-xs text-stone-500 block">Accreditation Dossier</span>
                    <h3 className="text-lg font-bold text-stone-900 font-serif">
                      {ngoDossier?.name || displayOrg || 'Registered Organization'}
                    </h3>
                    <p className="text-xs text-stone-600">
                      Structure: {ngoDossier?.type || 'Trust'} · Reg: {ngoDossier?.regNumber || 'Pending'}
                    </p>
                  </div>

                  <div>
                    {ngoDossier?.verificationStatus === 'Verified' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Verified NGO</span>
                      </span>
                    ) : ngoDossier?.verificationStatus === 'Rejected' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold">
                        <AlertTriangle className="w-4 h-4 text-rose-700" />
                        <span>Rejected (Action Required)</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold">
                        <Clock className="w-4 h-4 text-amber-700" />
                        <span>Pending Admin Audit</span>
                      </span>
                    )}
                  </div>
                </div>

                {ngoDossier?.verificationStatus === 'Rejected' && (
                  <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs space-y-2">
                    <strong className="text-rose-950 font-bold block">Auditor Rejection Reason:</strong>
                    <p className="text-rose-800">{ngoDossier.rejectionReason}</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setCurrentPage('ngo-register')}
                      className="bg-rose-800 hover:bg-rose-700 text-white mt-2"
                    >
                      <span>Update Documents & Resubmit</span>
                    </Button>
                  </div>
                )}

                {ngoDossier?.verificationStatus === 'Verified' ? (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Accreditation Active & Approved by {ngoDossier.reviewedBy || 'Admin'}</span>
                    </p>
                    <p className="text-stone-600">
                      Your sanctuary is officially displayed with the verified badge in the public directory and authorized to claim surplus rations and medical aid.
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-xs text-stone-500">
                      Need to attach certificates?
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage('ngo-register')}
                      className="border-teal-800 text-teal-950"
                    >
                      <span>Manage Verification Documents</span>
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB: Volunteer Missions with OTP Verification */}
          {activeTab === 'missions' && (
            <div className="space-y-4">
              {/* Volunteer Dispatch & Live Tracking Hero Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950 via-teal-900 to-stone-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-teal-800/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                      Live Swiggy-Style Tracking
                    </span>
                    <span className="text-xs text-stone-300">Mysuru City & Live GPS Telemetry</span>
                  </div>
                  <h4 className="text-base font-bold text-white font-serif">Volunteer Supply Dispatch & Telemetry</h4>
                  <p className="text-xs text-stone-300 max-w-xl">
                    Dispatch consignments using your current Mysuru location, calibrate transit speed (km/h) & distance (km), view live time remained, and verify handovers with 4-digit recipient OTP.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setCurrentPage('supply-tracker')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Launch Live Tracker & Dispatch</span>
                  </Button>
                </div>
              </div>

              {volunteerMissions.length === 0 ? (
                <Card className="text-center py-8 text-xs text-stone-500">
                  No active delivery missions assigned. Check the Volunteer Hub or click "Launch Live Tracker & Dispatch" above to begin a redistribution run.
                </Card>
              ) : (
                volunteerMissions.map((m) => (
                  <Card key={m.id} className="p-5 space-y-3 border-stone-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                              m.status === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-teal-100 text-teal-900'
                            }`}
                          >
                            {m.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-stone-500 font-mono">Ref: {m.id}</span>
                        </div>
                        <h3 className="text-base font-bold text-stone-900">{m.title}</h3>
                        <p className="text-xs text-stone-500">
                          Cargo: <strong className="text-stone-800">{m.quantity}</strong> ({m.category})
                        </p>
                      </div>

                      {m.status !== 'delivered' && (
                        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center shrink-0">
                          <span className="text-[10px] text-amber-800 font-semibold uppercase block">
                            Recipient Delivery PIN (OTP)
                          </span>
                          <span className="font-mono font-bold text-base text-amber-950 tracking-widest">
                            {m.deliveryPin}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1">
                        <span className="text-stone-500 font-semibold block flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>Pickup Location:</span>
                        </span>
                        <p className="font-bold text-stone-900">{m.donorName}</p>
                        <p className="text-stone-600">{m.pickupAddress}</p>
                        {m.donorPhone && <p className="text-teal-900 font-mono">{m.donorPhone}</p>}
                      </div>

                      <div className="p-3 bg-stone-50 rounded-lg border border-stone-100 space-y-1">
                        <span className="text-stone-500 font-semibold block flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Drop-Off Destination:</span>
                        </span>
                        <p className="font-bold text-stone-900">{m.recipientName}</p>
                        <p className="text-stone-600">{m.dropAddress}</p>
                        {m.recipientPhone && <p className="text-teal-900 font-mono">{m.recipientPhone}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                      {m.status === 'delivered' ? (
                        <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          <span>Delivery Handover Verified via OTP</span>
                        </span>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setActiveMission(m);
                            setOtpModalOpen(true);
                            setEnteredOtp('');
                            setOtpError(null);
                            setOtpSuccess(null);
                          }}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1.5"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Complete Delivery with Recipient OTP</span>
                        </Button>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB: Blood Bank Stock Matrix */}
          {activeTab === 'blood_inventory' && (
            <div className="space-y-4">
              <Card className="p-6 border-stone-200">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 font-serif">
                      Blood Bank Inventory Management
                    </h3>
                    <p className="text-xs text-stone-600">
                      Update real available units per blood group. Changes save persistently to MongoDB.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const res = await apiService.getBloodInventory();
                      setBloodInventory(res.inventory);
                    }}
                    className="text-xs text-stone-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    <span>Refresh Stock</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  {bloodInventory.map((item) => {
                    const isEditing = editingStockId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-center space-y-1.5"
                      >
                        <div className="text-base font-bold font-mono text-rose-900 bg-rose-100/70 py-1 rounded">
                          {item.bloodGroup}
                        </div>
                        {isEditing ? (
                          <div className="space-y-1 pt-1">
                            <input
                              type="number"
                              min="0"
                              value={editUnits}
                              onChange={(e) => setEditUnits(parseInt(e.target.value) || 0)}
                              className="w-full text-center py-1 text-sm border border-stone-300 rounded font-bold"
                            />
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleSaveStock(item)}
                                className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[11px] font-bold cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingStockId(null)}
                                className="px-2 py-0.5 bg-stone-300 text-stone-800 rounded text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xl font-extrabold text-stone-900 font-mono">
                              {item.unitsAvailable} <span className="text-[10px] font-normal text-stone-500">Units</span>
                            </div>
                            <button
                              onClick={() => {
                                setEditingStockId(item.id);
                                setEditUnits(item.unitsAvailable);
                              }}
                              className="text-[11px] text-teal-800 hover:text-teal-950 font-semibold underline cursor-pointer"
                            >
                              Update Units
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}

          {/* TAB: Listed Donations */}
          {activeTab === 'donations' && (
            <div className="space-y-3">
              {myDonationsError && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {myDonationsError}
                </div>
              )}
              {donationActionError && !editingDonation && (
                <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {donationActionError}
                </div>
              )}
              {loadingMyDonations ? (
                <Card className="text-center py-8 text-xs text-stone-500">Loading your donations…</Card>
              ) : myDonations.length === 0 ? (
                <Card className="text-center py-8 text-xs text-stone-500">
                  No resources listed yet. Click &quot;Post New Donation&quot; to publish your first donation.
                </Card>
              ) : (
                myDonations.map((item) => (
                  <Card key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-teal-900 bg-teal-50 px-2 py-0.5 rounded">
                          {item.categoryLabel || item.category}
                        </span>
                        <span className="text-[11px] text-stone-400">Listed {item.postedDate}</span>
                      </div>
                      <h3 className="text-sm font-bold text-stone-900">{item.title}</h3>
                      <p className="text-xs text-stone-500">
                        Quantity: <strong className="text-stone-800">{item.quantity}</strong> · {item.city}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded border ${
                          item.status === 'Available'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-amber-50 text-amber-900 border-amber-200'
                        }`}
                      >
                        {item.status}
                      </span>
                      {item.status === 'Available' ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openDonationEditor(item)}>
                            <Edit className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => void handleDeleteDonation(item)}>
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </Button>
                        </>
                      ) : (
                        <span className="text-[10px] text-stone-500">Unavailable while {item.status.toLowerCase()}</span>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB: Resource Requests */}
          {activeTab === 'requests' && (
            <div className="space-y-3">
              {handoverRequests.length === 0 ? (
                <Card className="text-center py-8 text-xs text-stone-500">
                  No resource requests recorded yet. Browse &quot;Find Available Resources&quot; to request essential supplies.
                </Card>
              ) : (
                handoverRequests.map((req) => (
                  <Card key={req.id} className="p-5 space-y-2 border-stone-200">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-stone-900">{req.resourceTitle}</h3>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600">Purpose: {req.purpose}</p>
                    <p className="text-[11px] text-stone-400">Beneficiaries: {req.beneficiaryCount} Residents</p>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* TAB: Blood Donor SOS */}
          {activeTab === 'blood_sos' && (
            <div className="space-y-3">
              {bloodPledges.length === 0 ? (
                <Card className="text-center py-8 text-xs text-stone-500">
                  No blood pledges recorded yet. Check emergency requests in the blood directory.
                </Card>
              ) : (
                bloodPledges.map((p) => (
                  <Card key={p.id} className="p-4 space-y-1 border-l-4 border-l-rose-600">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-rose-900 text-sm bg-rose-100 px-2 py-0.5 rounded">
                        {p.bloodGroup}
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">{p.status}</span>
                    </div>
                    <p className="text-xs font-bold text-stone-900">Patient: {p.patientName}</p>
                    <p className="text-xs text-stone-600">Hospital: {p.hospitalName}</p>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Platform Activity Log */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-5 space-y-4 border-stone-200">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Bell className="w-4 h-4 text-teal-800" />
              <h3 className="text-sm font-bold text-stone-900">Platform Activity Log</h3>
            </div>

            <div className="space-y-3 text-xs max-h-96 overflow-y-auto">
              {(propAlerts || []).map((alert) => (
                <div
                  key={alert.id}
                  className={`p-2.5 rounded-lg border space-y-1 ${
                    alert.type === 'urgent'
                      ? 'bg-rose-50 border-rose-100 text-rose-950'
                      : 'bg-teal-50 border-teal-100 text-teal-950'
                  }`}
                >
                  <p className="font-semibold">{alert.title}</p>
                  <p className="text-stone-600 text-[11px]">{alert.description}</p>
                  <span className="text-[10px] text-stone-400">{alert.timestamp}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Volunteer OTP Delivery Verification Modal */}
      {otpModalOpen && activeMission && (
        <Modal
          isOpen={otpModalOpen}
          onClose={() => setOtpModalOpen(false)}
          title="Verify Recipient Handover OTP"
          size="md"
        >
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-xs">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-900 space-y-1">
              <p className="font-bold">{activeMission.title}</p>
              <p className="text-[11px] text-teal-800">
                Delivering to: <strong>{activeMission.recipientName}</strong> at {activeMission.dropAddress}
              </p>
            </div>

            {otpError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                {otpError}
              </div>
            )}

            {otpSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-bold">
                {otpSuccess}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Recipient Handover PIN (OTP) *
              </label>
              <input
                type="text"
                maxLength={6}
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value)}
                placeholder="e.g. 4921"
                className="w-full text-center text-xl font-mono tracking-widest py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 font-bold"
              />
              <p className="text-[10px] text-stone-400 mt-1 text-center">
                Ask the authorized receiving staff for the 4-digit code shown on their dispatch voucher.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Name of Person Receiving Supplies
              </label>
              <input
                type="text"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder="e.g. Sister Mary Joseph / Store Keeper"
                className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs"
              />
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOtpModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                Confirm & Verify Handover
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Claim Donation for Ashram / NGO */}
      {claimModalOpen && selectedResourceToClaim && (
        <Modal
          isOpen={claimModalOpen}
          onClose={() => setClaimModalOpen(false)}
          title="Claim Donation for Ashram / NGO Sanctuary"
        >
          <form onSubmit={handleConfirmNgoClaim} className="space-y-4 text-xs">
            {claimSuccessMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Consignment Claim Registered!</span>
                </div>
                <p>{claimSuccessMsg}</p>
                <p className="text-[11px] text-emerald-700">
                  Switching to your Handover Manifest to monitor dispatch and access your 4-digit recipient OTP...
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-500">Resource</span>
                    <h4 className="font-bold text-sm text-stone-900">{selectedResourceToClaim.title}</h4>
                    <p className="text-stone-600">
                      Total Available: <strong>{selectedResourceToClaim.quantity}</strong> ({selectedResourceToClaim.category})
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded bg-teal-100 text-teal-900 font-bold text-[11px]">
                    {selectedResourceToClaim.condition}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Ashram / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={claimForm.organizationName}
                    onChange={(e) => setClaimForm({ ...claimForm, organizationName: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs"
                    placeholder="e.g. Karuna Vridhashram & Child Haven"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Beneficiaries Supported *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={claimForm.beneficiaryCount}
                      onChange={(e) => setClaimForm({ ...claimForm, beneficiaryCount: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs"
                      placeholder="e.g. 65"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Quantity Required *
                    </label>
                    <input
                      type="text"
                      required
                      value={claimForm.requestedQuantity}
                      onChange={(e) => setClaimForm({ ...claimForm, requestedQuantity: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs"
                      placeholder="e.g. Full Consignment / 25 kg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-800 mb-1">
                    Institutional Requirement & Purpose *
                  </label>
                  <select
                    value={claimForm.purpose}
                    onChange={(e) => setClaimForm({ ...claimForm, purpose: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs bg-white"
                  >
                    <option value="Daily nutritional breakfast & meals for elderly residents">
                      Daily nutritional breakfast & meals for elderly residents
                    </option>
                    <option value="Emergency medical relief and geriatric healthcare aid">
                      Emergency medical relief and geriatric healthcare aid
                    </option>
                    <option value="Winter warm clothing and blanket distribution">
                      Winter warm clothing and blanket distribution
                    </option>
                    <option value="Educational material & stationery for shelter children">
                      Educational material & stationery for shelter children
                    </option>
                    <option value="Community kitchen ration redistribution">
                      Community kitchen ration redistribution
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Urgency Level
                    </label>
                    <select
                      value={claimForm.urgency}
                      onChange={(e) => setClaimForm({ ...claimForm, urgency: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs bg-white"
                    >
                      <option value="Standard">Standard (Within 24-48 Hours)</option>
                      <option value="High Priority">High Priority (Within 12 Hours)</option>
                      <option value="Urgent Today">Urgent Today (Immediate Supply)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-stone-800 mb-1">
                      Fulfillment Mode
                    </label>
                    <select
                      value={claimForm.fulfillmentMode}
                      onChange={(e) => setClaimForm({ ...claimForm, fulfillmentMode: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-xs bg-white"
                    >
                      <option value="Volunteer Delivery">Volunteer Doorstep Delivery</option>
                      <option value="Self Pickup">Self-Organized Ashram Van Pickup</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] space-y-1">
                  <div className="flex items-center gap-1 font-bold text-amber-950">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Recipient 4-Digit OTP Handover Security</span>
                  </div>
                  <p>
                    Once confirmed, a secret 4-digit recipient PIN will be generated in your Handover Manifest. Provide this code to the volunteer upon vehicle arrival to authorize physical release.
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setClaimModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="bg-teal-900 hover:bg-teal-800 text-white font-bold"
                  >
                    Confirm Consignment Claim
                  </Button>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}

      <Modal
        isOpen={editingDonation !== null}
        onClose={() => {
          if (!savingDonation) {
            setEditingDonation(null);
            setDonationActionError(null);
          }
        }}
        title="Edit Donation"
        subtitle="Update the details recipients see for this available item."
      >
        <form onSubmit={handleSaveDonation} className="space-y-4">
          {donationActionError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {donationActionError}
            </div>
          )}
          <label className="block text-xs font-semibold text-stone-700">
            Item name
            <input required value={donationEditForm.title} onChange={(e) => setDonationEditForm({ ...donationEditForm, title: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-semibold text-stone-700">
            Donation category
            <select required value={donationEditForm.category} onChange={(e) => setDonationEditForm({ ...donationEditForm, category: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
              {['Food & Grains', 'Clothes & Blankets', 'Books & Education', 'Mobility & Medical', 'Hygiene & Sanitation', 'Infant Care'].map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-stone-700">
              Quantity
              <input required value={donationEditForm.quantity} onChange={(e) => setDonationEditForm({ ...donationEditForm, quantity: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Condition
              <select value={donationEditForm.condition} onChange={(e) => setDonationEditForm({ ...donationEditForm, condition: e.target.value as ResourceItem['condition'] })} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
                {['New / Unopened', 'Gently Used', 'Good Condition'].map((condition) => <option key={condition}>{condition}</option>)}
              </select>
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              City
              <input required value={donationEditForm.city} onChange={(e) => setDonationEditForm({ ...donationEditForm, city: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Locality
              <input required value={donationEditForm.locality} onChange={(e) => setDonationEditForm({ ...donationEditForm, locality: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-semibold text-stone-700">
            Description
            <textarea rows={3} value={donationEditForm.description} onChange={(e) => setDonationEditForm({ ...donationEditForm, description: e.target.value })} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm" />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-stone-700">
            <input type="checkbox" checked={donationEditForm.pickupAvailable} onChange={(e) => setDonationEditForm({ ...donationEditForm, pickupAvailable: e.target.checked })} />
            Pickup is available
          </label>
          <div className="flex justify-end gap-2 border-t border-stone-200 pt-3">
            <Button type="button" variant="outline" onClick={() => setEditingDonation(null)} disabled={savingDonation}>Cancel</Button>
            <Button type="submit" disabled={savingDonation}>
              <Save className="h-4 w-4" />
              {savingDonation ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
