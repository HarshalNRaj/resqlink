/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  PageId,
  UserRole,
  ResourceItem,
  BloodRequest,
  NGOProfile,
  VolunteerTask,
  HandoverRequest,
  BloodDonationPledge,
  SupplyDeliveryMission,
} from './types';
import { StorageService, PendingNgoApplication, PlatformAlert } from './services/storageService';
import { apiService, AuthUser } from './services/apiService';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { DatabaseManagerModal } from './components/common/DatabaseManagerModal';

// Pages
import { HomePage } from './pages/HomePage';
import { AuthPage } from './pages/AuthPage';
import { DonatePage } from './pages/DonatePage';
import { ResourcesPage } from './pages/ResourcesPage';
import { NgoDirectoryPage } from './pages/NgoDirectoryPage';
import { NgoRegisterPage } from './pages/NgoRegisterPage';
import { BloodBankDirectoryPage } from './pages/BloodBankDirectoryPage';
import { BloodInventoryPage } from './pages/BloodInventoryPage';
import { VolunteersPage } from './pages/VolunteersPage';
import { VolunteerTrackingPage } from './pages/VolunteerTrackingPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => apiService.getCurrentUser());

  // Make Login and Registration the first screen if user is not authenticated
  const [currentPage, setCurrentPage] = useState<PageId>(() => {
    return apiService.isAuthenticated() ? 'user-dashboard' : 'auth';
  });

  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    const auth = apiService.getCurrentUser();
    return auth?.activeRole || 'donor';
  });

  const [dbModalOpen, setDbModalOpen] = useState(false);

  // Persistent entities
  const [resources, setResources] = useState<ResourceItem[]>(() => StorageService.getResources());
  const [ngos, setNgos] = useState<NGOProfile[]>(() => StorageService.getNgos());
  const [bloodRequests, setBloodRequests] = useState<BloodRequest[]>(() => StorageService.getBloodRequests());
  const [volunteerTasks, setVolunteerTasks] = useState<VolunteerTask[]>(() => StorageService.getVolunteerTasks());
  const [ngoApplications, setNgoApplications] = useState<PendingNgoApplication[]>(() => StorageService.getNgoApplications());
  const [alerts, setAlerts] = useState<PlatformAlert[]>(() => StorageService.getAlerts());
  const [userShifts, setUserShifts] = useState<string[]>(() => StorageService.getUserVolunteerShifts());
  const [handoverRequests, setHandoverRequests] = useState<HandoverRequest[]>(() => StorageService.getHandoverRequests());
  const [bloodPledges, setBloodPledges] = useState<BloodDonationPledge[]>(() => StorageService.getBloodPledges());
  const [supplyMissions, setSupplyMissions] = useState<SupplyDeliveryMission[]>(() => StorageService.getSupplyMissions());

  // Role switching
  const handleRoleChange = async (newRole: UserRole) => {
    setCurrentRoleState(newRole);
    StorageService.saveCurrentRole(newRole);

    if (currentUser) {
      try {
        const res = await apiService.switchRole(newRole);
        setCurrentUser(res.user);
      } catch {
        // Local state already updated
      }
    }
  };

  const handleLogout = () => {
    apiService.clearSession();
    setCurrentUser(null);
    setCurrentPage('auth');
  };

  const handleAuthSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setCurrentRoleState(user.activeRole);
  };

  // Synchronize live entities from the backend on mount
  useEffect(() => {
    const loadDbData = async () => {
      try {
        const [resList, ngoList, bloodList, handoverList] = await Promise.allSettled([
          apiService.getResources(),
          apiService.getNgos(),
          apiService.getBloodRequests(),
          apiService.getHandoverRequests(),
        ]);
        if (resList.status === 'fulfilled' && resList.value?.length) {
          setResources(resList.value);
        }
        if (ngoList.status === 'fulfilled' && ngoList.value?.length) {
          setNgos(ngoList.value);
        }
        if (bloodList.status === 'fulfilled' && bloodList.value?.length) {
          setBloodRequests(bloodList.value);
        }
        if (handoverList.status === 'fulfilled' && handoverList.value?.length) {
          setHandoverRequests(handoverList.value);
        }
      } catch (err) {
        console.error('Failed to sync data from backend:', err);
      }
    };
    loadDbData();
  }, []);

  // Route protection
  useEffect(() => {
    if (!currentUser && (currentPage === 'user-dashboard' || currentPage === 'admin-dashboard')) {
      setCurrentPage('auth');
    }
    if (currentPage === 'admin-dashboard' && currentRole !== 'admin') {
      setCurrentPage('user-dashboard');
    }
  }, [currentPage, currentUser, currentRole]);

  const handleAddResource = async (item: ResourceItem) => {
    const created = await apiService.createResource({
      id: item.id,
      title: item.title,
      category: item.categoryLabel || item.category,
      quantity: item.quantity,
      location: item.locality || item.city,
      city: item.city,
      condition: item.condition,
      donorName: item.donorName,
      donorContact: item.contactPhone,
      donorType: item.donorType,
      urgency: 'Medium',
      status: item.status,
      pickupInstructions: item.pickupAvailable ? 'Pickup available' : 'Drop-off required',
      postedDate: item.postedDate,
      imageUrl: item.imageUrl,
      photos: item.images || [item.imageUrl],
    });
    const updated = StorageService.saveResource({
      ...item,
      id: created.id,
      donorId: currentUser?.id,
      donorName: currentUser?.name || item.donorName,
    });
    setResources(updated);

    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'New Donation Published',
      description: `"${item.title}" added to active redistribution registry for ${item.city}.`,
      timestamp: 'Just now',
      type: 'info',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handleUpdateResource = (item: ResourceItem) => {
    StorageService.updateResource(item);
    setResources((current) => current.map((resource) => resource.id === item.id ? item : resource));
  };

  const handleDeleteResource = (id: string) => {
    StorageService.deleteResource(id);
    setResources((current) => current.filter((resource) => resource.id !== id));
  };

  const handleRequestResource = async (req: HandoverRequest) => {
    try {
      await apiService.createHandoverRequest({
        id: req.id,
        resourceId: req.resourceId,
        resourceTitle: req.resourceTitle,
        requesterId: currentUser?.id,
        requesterName: req.requesterName,
        requesterType: req.organization,
        requesterPhone: req.phone,
        purpose: req.purpose,
        requestDate: req.requestedDate,
        status: req.status,
      });
    } catch (e) {
      console.warn('Backend handover persistence notice:', e);
    }

    const result = StorageService.submitHandoverRequest(req);
    setHandoverRequests(result.updatedRequests);
    setResources(result.updatedResources);

    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'Resource Handover Requested',
      description: `${req.requesterName} requested "${req.resourceTitle}". Status updated to Reserved.`,
      timestamp: 'Just now',
      type: 'info',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handleCompleteHandover = (requestId: string, resourceId: string) => {
    const result = StorageService.updateHandoverStatus(requestId, 'Completed');
    setHandoverRequests(result.updatedRequests);
    setResources(result.updatedResources);

    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'Handover Completed',
      description: 'Donation delivery verified. Status marked as Redistributed.',
      timestamp: 'Just now',
      type: 'success',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handleAddBloodRequest = (req: BloodRequest) => {
    const updated = StorageService.saveBloodRequest(req);
    setBloodRequests(updated);

    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: `Emergency ${req.bloodGroup} Blood Broadcast`,
      description: `Urgent SOS submitted for ${req.patientName} at ${req.hospitalName}.`,
      timestamp: 'Just now',
      type: 'urgent',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handlePledgeBlood = async (pledge: BloodDonationPledge) => {
    try {
      await apiService.createBloodPledge({
        id: pledge.id,
        requestId: pledge.requestId,
        donorName: pledge.donorName,
        donorPhone: pledge.donorPhone,
        donorBloodGroup: pledge.bloodGroup,
        pledgedUnits: (pledge as any).unitsPledged || 1,
        pledgedAt: pledge.pledgedDate,
      });
    } catch (e) {
      console.warn('Backend blood pledge notice:', e);
    }

    const result = StorageService.submitBloodPledge(pledge);
    setBloodPledges(result.updatedPledges);
    setBloodRequests(result.updatedRequests);

    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'Blood Donor Pledge Confirmed',
      description: `${pledge.donorName} stepped forward to donate ${pledge.bloodGroup} for ${pledge.patientName}.`,
      timestamp: 'Just now',
      type: 'success',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handleRegisterVolunteerTask = (taskId: string, volunteerName: string) => {
    const updatedTasks = StorageService.updateVolunteerTaskRegistration(taskId);
    setVolunteerTasks(updatedTasks);

    const updatedShifts = StorageService.recordUserVolunteerShift(taskId);
    setUserShifts(updatedShifts);

    const task = updatedTasks.find((t) => t.id === taskId);
    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'Volunteer Shift Confirmed',
      description: `${volunteerName} registered for ${task?.title || 'community drive'}.`,
      timestamp: 'Just now',
      type: 'success',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handleCancelVolunteerShift = (taskId: string) => {
    const result = StorageService.cancelVolunteerShift(taskId);
    setVolunteerTasks(result.updatedTasks);
    setUserShifts(result.updatedShifts);

    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'Volunteer Shift Cancelled',
      description: 'Your shift has been released back into the available volunteer slots.',
      timestamp: 'Just now',
      type: 'info',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handleSubmitNgoApplication = (app: PendingNgoApplication) => {
    const updated = StorageService.submitNgoApplication(app);
    setNgoApplications(updated);

    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'NGO Accreditation Dossier Queued',
      description: `${app.name} submitted for administrative verification (Ref: ${app.id}).`,
      timestamp: 'Just now',
      type: 'info',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const handleUpdateSupplyMission = (mission: SupplyDeliveryMission) => {
    const updated = StorageService.saveSupplyMission(mission);
    setSupplyMissions(updated);
  };

  const handleCompleteSupplyMission = (
    missionId: string,
    proof: NonNullable<SupplyDeliveryMission['proofOfDelivery']>
  ) => {
    const result = StorageService.completeSupplyMission(missionId, proof);
    setSupplyMissions(result.updatedMissions);
    setHandoverRequests(result.updatedRequests);
    setResources(result.updatedResources);

    const m = result.updatedMissions.find((item) => item.id === missionId);
    const alert: PlatformAlert = {
      id: `alt-${Date.now().toString().slice(-4)}`,
      title: 'Supply Delivery Handover Confirmed',
      description: `Volunteer safely delivered "${m?.resourceTitle || 'Supplies'}" to ${m?.recipientName || 'sanctuary'}. Handover PIN verified.`,
      timestamp: 'Just now',
      type: 'success',
    };
    setAlerts(StorageService.addAlert(alert));
  };

  const refreshAllData = () => {
    setResources(StorageService.getResources());
    setNgos(StorageService.getNgos());
    setBloodRequests(StorageService.getBloodRequests());
    setVolunteerTasks(StorageService.getVolunteerTasks());
    setNgoApplications(StorageService.getNgoApplications());
    setAlerts(StorageService.getAlerts());
    setUserShifts(StorageService.getUserVolunteerShifts());
    setHandoverRequests(StorageService.getHandoverRequests());
    setBloodPledges(StorageService.getBloodPledges());
    setSupplyMissions(StorageService.getSupplyMissions());
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-[#1C1917]">
      {/* Global Navigation with Real Auth and Multi-Role Switcher */}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        currentRole={currentRole}
        setCurrentRole={handleRoleChange}
        authUser={currentUser}
        onLogout={handleLogout}
        onOpenDbManager={() => setDbModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <HomePage setCurrentPage={setCurrentPage} />
        )}

        {currentPage === 'auth' && (
          <AuthPage
            setCurrentPage={setCurrentPage}
            currentRole={currentRole}
            setCurrentRole={handleRoleChange}
            onAuthSuccess={handleAuthSuccess}
          />
        )}

        {currentPage === 'donate' && (
          <DonatePage
            setCurrentPage={setCurrentPage}
            onAddResource={handleAddResource}
          />
        )}

        {currentPage === 'resources' && (
          <ResourcesPage
            resources={resources}
            setCurrentPage={setCurrentPage}
            onRequestResource={handleRequestResource}
          />
        )}

        {currentPage === 'ngos' && (
          <NgoDirectoryPage
            setCurrentPage={setCurrentPage}
            ngos={ngos}
          />
        )}

        {currentPage === 'ngo-register' && (
          <NgoRegisterPage
            setCurrentPage={setCurrentPage}
            onSubmitApplication={handleSubmitNgoApplication}
          />
        )}

        {currentPage === 'blood-banks' && (
          <BloodBankDirectoryPage setCurrentPage={setCurrentPage} />
        )}

        {currentPage === 'blood-inventory' && (
          <BloodInventoryPage
            setCurrentPage={setCurrentPage}
            bloodRequests={bloodRequests}
            onAddBloodRequest={handleAddBloodRequest}
            onPledgeBlood={handlePledgeBlood}
          />
        )}

        {currentPage === 'volunteers' && (
          <VolunteersPage
            setCurrentPage={setCurrentPage}
            tasks={volunteerTasks}
            onSignup={handleRegisterVolunteerTask}
            onTrackSupplyRun={() => setCurrentPage('supply-tracker')}
          />
        )}

        {currentPage === 'supply-tracker' && (
          <VolunteerTrackingPage
            setCurrentPage={setCurrentPage}
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
            missions={supplyMissions}
            onUpdateMission={handleUpdateSupplyMission}
            onCompleteDelivery={handleCompleteSupplyMission}
          />
        )}

        {currentPage === 'user-dashboard' && (
          <UserDashboardPage
            setCurrentPage={setCurrentPage}
            currentRole={currentRole}
            setCurrentRole={handleRoleChange}
            resources={resources}
            onUpdateResource={handleUpdateResource}
            onDeleteResource={handleDeleteResource}
            alerts={alerts}
            userShifts={userShifts}
            handoverRequests={handoverRequests}
            bloodPledges={bloodPledges}
            volunteerTasks={volunteerTasks}
            onCompleteHandover={handleCompleteHandover}
            onCancelShift={handleCancelVolunteerShift}
            onOpenDbManager={() => setDbModalOpen(true)}
            onTrackSupplyRun={() => setCurrentPage('supply-tracker')}
          />
        )}

        {currentPage === 'admin-dashboard' && (
          <AdminDashboardPage
            setCurrentPage={setCurrentPage}
            onOpenDbManager={() => setDbModalOpen(true)}
          />
        )}
      </main>

      {/* Global Institutional Footer */}
      <Footer setCurrentPage={setCurrentPage} />

      {/* Database Management & Automated Subsystem Linkage Test Suite */}
      <DatabaseManagerModal
        isOpen={dbModalOpen}
        onClose={() => setDbModalOpen(false)}
        onRefreshData={refreshAllData}
      />
    </div>
  );
}
