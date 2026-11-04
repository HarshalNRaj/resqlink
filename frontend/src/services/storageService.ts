/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ResourceItem,
  NGOProfile,
  BloodBank,
  BloodRequest,
  VolunteerTask,
  UserProfile,
  UserRole,
  HandoverRequest,
  BloodDonationPledge,
  SupplyDeliveryMission,
  SupplyRunStatus,
} from '../types';
import {
  SAMPLE_RESOURCES,
  SAMPLE_NGOS,
  SAMPLE_BLOOD_BANKS,
  SAMPLE_BLOOD_REQUESTS,
  SAMPLE_VOLUNTEER_TASKS,
  DEMO_USER_PROFILES,
  SAMPLE_SUPPLY_MISSIONS,
} from '../data/sampleData';

export interface PendingNgoApplication {
  id: string;
  name: string;
  type: string;
  regNumber: string;
  darpanId?: string;
  city: string;
  state: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  beneficiaries: number;
  submittedDate: string;
  status: 'Pending Audit' | 'Approved' | 'Requires Clarification';
  focusAreas: string;
  immediateNeeds: string;
}

export interface PlatformAlert {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'urgent' | 'success';
}

const STORAGE_KEYS = {
  RESOURCES: 'giveconnect_resources_v1',
  NGOS: 'giveconnect_ngos_v1',
  BLOOD_REQUESTS: 'giveconnect_blood_requests_v1',
  VOLUNTEER_TASKS: 'giveconnect_volunteer_tasks_v1',
  NGO_APPLICATIONS: 'giveconnect_ngo_applications_v1',
  CURRENT_USER: 'giveconnect_current_user_v1',
  CURRENT_ROLE: 'giveconnect_current_role_v1',
  ALERTS: 'giveconnect_alerts_v1',
  USER_VOLUNTEER_SHIFTS: 'giveconnect_user_shifts_v1',
  HANDOVER_REQUESTS: 'giveconnect_handover_requests_v1',
  BLOOD_PLEDGES: 'giveconnect_blood_pledges_v1',
  SUPPLY_MISSIONS: 'giveconnect_supply_missions_mysuru_v2',
};

const INITIAL_APPLICATIONS: PendingNgoApplication[] = [
  {
    id: 'app-01',
    name: 'Apeksha Special Needs & Rehabilitation Home',
    type: 'Shelter Home',
    regNumber: 'TS-HYD-REG/2018/142',
    darpanId: 'TS/2019/0319281',
    city: 'Hyderabad',
    state: 'Telangana',
    address: 'Near Balanagar Cross Roads, Jeedimetla',
    contactPerson: 'K. Padma Rao',
    phone: '+91 99890 22119',
    email: 'support@apekshahome.example.org',
    beneficiaries: 65,
    submittedDate: '2026-10-31',
    status: 'Pending Audit',
    focusAreas: 'Special Needs, Differently Abled',
    immediateNeeds: 'Wheelchairs, Sensory toys, Milk supplements',
  },
  {
    id: 'app-02',
    name: 'Sneha Sanjeevani Eldercare Trust',
    type: 'Ashram',
    regNumber: 'KA-BLR-TR/2021/410',
    darpanId: 'KA/2022/019941',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: 'Survey 14, Bannerghatta Main Road',
    contactPerson: 'Dr. Mohan Hegde',
    phone: '+91 98450 44912',
    email: 'contact@snehasanjeevani.org',
    beneficiaries: 110,
    submittedDate: '2026-10-30',
    status: 'Pending Audit',
    focusAreas: 'Elderly Care, Geriatric Wellness',
    immediateNeeds: 'Adult diapers, Rice, Blankets',
  },
  {
    id: 'app-03',
    name: 'Pratibha Child Welfare & Educational Mission',
    type: 'Child Care Trust',
    regNumber: 'DL-SOC/2019/882',
    darpanId: 'DL/2020/08192',
    city: 'New Delhi',
    state: 'Delhi NCR',
    address: 'Block C, Shakarpur',
    contactPerson: 'Anjali Sharma',
    phone: '+91 98110 99441',
    email: 'info@pratibhachild.org',
    beneficiaries: 95,
    submittedDate: '2026-10-28',
    status: 'Pending Audit',
    focusAreas: 'Education, Child Care',
    immediateNeeds: 'School bags, Notebooks, Dry rations',
  },
];

const INITIAL_ALERTS: PlatformAlert[] = [
  {
    id: 'alt-01',
    title: 'Ashram Supply Coordination',
    description: 'Karuna Vridhashram confirmed pickup for whole grain supplies on Saturday at 11:00 AM.',
    timestamp: '2 hours ago',
    type: 'info',
  },
  {
    id: 'alt-02',
    title: 'Urgent Rare Blood SOS in Bengaluru',
    description: 'Victoria Hospital trauma center posted an urgent requirement for O- negative blood.',
    timestamp: '4 hours ago',
    type: 'urgent',
  },
  {
    id: 'alt-03',
    title: 'Volunteer Shift Confirmed',
    description: 'You are registered for the weekend grain sorting and packing drive at Koramangala Depot.',
    timestamp: '1 day ago',
    type: 'success',
  },
];

function loadJson<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Failed reading key ${key} from localStorage, using default`, err);
    return defaultValue;
  }
}

function saveJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Failed saving key ${key} to localStorage`, err);
  }
}

export const StorageService = {
  // Resources
  getResources(): ResourceItem[] {
    return loadJson<ResourceItem[]>(STORAGE_KEYS.RESOURCES, SAMPLE_RESOURCES);
  },
  saveResource(item: ResourceItem): ResourceItem[] {
    const list = this.getResources();
    const updated = [item, ...list];
    saveJson(STORAGE_KEYS.RESOURCES, updated);
    return updated;
  },
  updateResource(item: ResourceItem): ResourceItem[] {
    const updated = this.getResources().map((resource) => resource.id === item.id ? item : resource);
    saveJson(STORAGE_KEYS.RESOURCES, updated);
    return updated;
  },
  deleteResource(id: string): ResourceItem[] {
    const updated = this.getResources().filter((resource) => resource.id !== id);
    saveJson(STORAGE_KEYS.RESOURCES, updated);
    return updated;
  },

  // NGOs
  getNgos(): NGOProfile[] {
    return loadJson<NGOProfile[]>(STORAGE_KEYS.NGOS, SAMPLE_NGOS);
  },
  saveNgo(ngo: NGOProfile): NGOProfile[] {
    const list = this.getNgos();
    const updated = [ngo, ...list];
    saveJson(STORAGE_KEYS.NGOS, updated);
    return updated;
  },

  // Blood Requests
  getBloodRequests(): BloodRequest[] {
    return loadJson<BloodRequest[]>(STORAGE_KEYS.BLOOD_REQUESTS, SAMPLE_BLOOD_REQUESTS);
  },
  saveBloodRequest(req: BloodRequest): BloodRequest[] {
    const list = this.getBloodRequests();
    const updated = [req, ...list];
    saveJson(STORAGE_KEYS.BLOOD_REQUESTS, updated);
    return updated;
  },

  // Volunteer Tasks
  getVolunteerTasks(): VolunteerTask[] {
    return loadJson<VolunteerTask[]>(STORAGE_KEYS.VOLUNTEER_TASKS, SAMPLE_VOLUNTEER_TASKS);
  },
  updateVolunteerTaskRegistration(taskId: string): VolunteerTask[] {
    const list = this.getVolunteerTasks();
    const updated = list.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          volunteersRegistered: Math.min(task.volunteersNeeded, task.volunteersRegistered + 1),
        };
      }
      return task;
    });
    saveJson(STORAGE_KEYS.VOLUNTEER_TASKS, updated);
    return updated;
  },

  // User Registered Shifts
  getUserVolunteerShifts(): string[] {
    return loadJson<string[]>(STORAGE_KEYS.USER_VOLUNTEER_SHIFTS, ['task-01']);
  },
  recordUserVolunteerShift(taskId: string): string[] {
    const list = this.getUserVolunteerShifts();
    if (!list.includes(taskId)) {
      const updated = [...list, taskId];
      saveJson(STORAGE_KEYS.USER_VOLUNTEER_SHIFTS, updated);
      return updated;
    }
    return list;
  },

  // Pending NGO Accreditation Applications
  getNgoApplications(): PendingNgoApplication[] {
    return loadJson<PendingNgoApplication[]>(STORAGE_KEYS.NGO_APPLICATIONS, INITIAL_APPLICATIONS);
  },
  submitNgoApplication(app: PendingNgoApplication): PendingNgoApplication[] {
    const list = this.getNgoApplications();
    const updated = [app, ...list];
    saveJson(STORAGE_KEYS.NGO_APPLICATIONS, updated);
    this.persistNgoAppToBackend(app).catch(() => {});
    return updated;
  },
  auditNgoApplication(
    appId: string,
    newStatus: 'Approved' | 'Requires Clarification'
  ): { applications: PendingNgoApplication[]; newNgo?: NGOProfile } {
    const list = this.getNgoApplications();
    let approvedApp: PendingNgoApplication | undefined;

    const updatedApps = list.map((app) => {
      if (app.id === appId) {
        approvedApp = app;
        return { ...app, status: newStatus };
      }
      return app;
    });

    saveJson(STORAGE_KEYS.NGO_APPLICATIONS, updatedApps);
    this.persistNgoAppAuditToBackend(appId, newStatus).catch(() => {});

    // If approved, automatically add or verify in the public NGO directory
    let newNgo: NGOProfile | undefined;
    if (newStatus === 'Approved' && approvedApp) {
      newNgo = {
        id: `ngo-${approvedApp.id}`,
        name: approvedApp.name,
        type: approvedApp.type as any,
        registrationNumber: approvedApp.regNumber,
        darpanId: approvedApp.darpanId,
        verifiedStatus: 'Verified',
        city: approvedApp.city,
        state: approvedApp.state,
        address: approvedApp.address,
        phone: approvedApp.phone,
        email: approvedApp.email,
        yearEstablished: 2018,
        beneficiaryCount: approvedApp.beneficiaries,
        focusAreas: approvedApp.focusAreas.split(',').map((s) => s.trim()),
        activeNeeds: approvedApp.immediateNeeds.split(',').map((s) => s.trim()),
        summary: `Accredited care facility serving ${approvedApp.beneficiaries} residents. Verified via official registration deed and premises audit.`,
        headOfOrganization: approvedApp.contactPerson,
        imageUrl: '/src/assets/images/ngo_distribution_care_1793546425595.jpg',
      };
      this.saveNgo(newNgo);
    }

    return { applications: updatedApps, newNgo };
  },

  // Active Role and Profile
  getCurrentRole(): UserRole {
    return loadJson<UserRole>(STORAGE_KEYS.CURRENT_ROLE, 'donor');
  },
  saveCurrentRole(role: UserRole): void {
    saveJson(STORAGE_KEYS.CURRENT_ROLE, role);
  },
  getCurrentUser(role: UserRole): UserProfile {
    return loadJson<UserProfile>(
      `${STORAGE_KEYS.CURRENT_USER}_${role}`,
      DEMO_USER_PROFILES[role] || DEMO_USER_PROFILES.donor
    );
  },
  saveCurrentUser(user: UserProfile): void {
    saveJson(`${STORAGE_KEYS.CURRENT_USER}_${user.role}`, user);
  },

  // Alerts
  getAlerts(): PlatformAlert[] {
    return loadJson<PlatformAlert[]>(STORAGE_KEYS.ALERTS, INITIAL_ALERTS);
  },
  addAlert(alert: PlatformAlert): PlatformAlert[] {
    const list = this.getAlerts();
    const updated = [alert, ...list];
    saveJson(STORAGE_KEYS.ALERTS, updated);
    return updated;
  },

  // Handover Requests
  getHandoverRequests(): HandoverRequest[] {
    return loadJson<HandoverRequest[]>(STORAGE_KEYS.HANDOVER_REQUESTS, [
      {
        id: 'req-handover-01',
        resourceId: 'res-05',
        resourceTitle: 'Essential Hygiene & Sanitation Kits (150 Family Packs)',
        requesterName: 'Aarogya Seva Circle',
        organization: 'Community Relief Unit',
        phone: '+91 94220 99110',
        beneficiaryCount: 150,
        purpose: 'Direct distribution to families in temporary rehabilitation shelters.',
        requestedDate: '2026-10-31',
        status: 'Handover Scheduled',
        donorName: 'Aarogya Seva Circle',
        donorPhone: '+91 94220 99110',
      },
    ]);
  },
  submitHandoverRequest(
    req: HandoverRequest
  ): { updatedRequests: HandoverRequest[]; updatedResources: ResourceItem[] } {
    const requests = this.getHandoverRequests();
    const updatedRequests = [req, ...requests];
    saveJson(STORAGE_KEYS.HANDOVER_REQUESTS, updatedRequests);

    // Update resource status to 'Reserved'
    const resources = this.getResources();
    const updatedResources = resources.map((r) =>
      r.id === req.resourceId ? { ...r, status: 'Reserved' as const, reservedBy: req.requesterName } : r
    );
    saveJson(STORAGE_KEYS.RESOURCES, updatedResources);
    this.persistHandoverToBackend(req).catch(() => {});

    return { updatedRequests, updatedResources };
  },
  updateHandoverStatus(
    requestId: string,
    newStatus: HandoverRequest['status']
  ): { updatedRequests: HandoverRequest[]; updatedResources: ResourceItem[] } {
    const requests = this.getHandoverRequests();
    let targetResourceId = '';
    const updatedRequests = requests.map((r) => {
      if (r.id === requestId) {
        targetResourceId = r.resourceId;
        return { ...r, status: newStatus };
      }
      return r;
    });
    saveJson(STORAGE_KEYS.HANDOVER_REQUESTS, updatedRequests);

    const resources = this.getResources();
    const updatedResources = resources.map((r) => {
      if (r.id === targetResourceId) {
        return {
          ...r,
          status: newStatus === 'Completed' ? ('Redistributed' as const) : ('Reserved' as const),
        };
      }
      return r;
    });
    saveJson(STORAGE_KEYS.RESOURCES, updatedResources);

    return { updatedRequests, updatedResources };
  },

  // Blood Pledges
  getBloodPledges(): BloodDonationPledge[] {
    return loadJson<BloodDonationPledge[]>(STORAGE_KEYS.BLOOD_PLEDGES, [
      {
        id: 'pld-01',
        requestId: 'req-03',
        patientName: 'Baby Aarav (Age 4, Thalassemia Major)',
        hospitalName: 'Apollo Childrens Hospital',
        bloodGroup: 'B-',
        donorName: 'Anand Varma',
        donorPhone: '+91 98450 11223',
        pledgedDate: '2026-10-31',
        status: 'Pledge Confirmed',
      },
    ]);
  },
  submitBloodPledge(
    pledge: BloodDonationPledge
  ): { updatedPledges: BloodDonationPledge[]; updatedRequests: BloodRequest[] } {
    const pledges = this.getBloodPledges();
    const updatedPledges = [pledge, ...pledges];
    saveJson(STORAGE_KEYS.BLOOD_PLEDGES, updatedPledges);

    const requests = this.getBloodRequests();
    const updatedRequests = requests.map((req) =>
      req.id === pledge.requestId ? { ...req, status: 'Fulfillers Assigned' as const } : req
    );
    saveJson(STORAGE_KEYS.BLOOD_REQUESTS, updatedRequests);
    this.persistBloodPledgeToBackend(pledge).catch(() => {});

    return { updatedPledges, updatedRequests };
  },

  // Cancel Volunteer Shift
  cancelVolunteerShift(
    taskId: string
  ): { updatedTasks: VolunteerTask[]; updatedShifts: string[] } {
    const shifts = this.getUserVolunteerShifts().filter((id) => id !== taskId);
    saveJson(STORAGE_KEYS.USER_VOLUNTEER_SHIFTS, shifts);

    const tasks = this.getVolunteerTasks().map((t) => {
      if (t.id === taskId) {
        return { ...t, volunteersRegistered: Math.max(0, t.volunteersRegistered - 1) };
      }
      return t;
    });
    saveJson(STORAGE_KEYS.VOLUNTEER_TASKS, tasks);

    return { updatedTasks: tasks, updatedShifts: shifts };
  },

  // Live Supply Delivery Missions (Swiggy-style tracking)
  getSupplyMissions(): SupplyDeliveryMission[] {
    return loadJson<SupplyDeliveryMission[]>(STORAGE_KEYS.SUPPLY_MISSIONS, SAMPLE_SUPPLY_MISSIONS);
  },

  saveSupplyMission(mission: SupplyDeliveryMission): SupplyDeliveryMission[] {
    const list = this.getSupplyMissions();
    const existingIndex = list.findIndex((m) => m.id === mission.id);
    let updated: SupplyDeliveryMission[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = mission;
    } else {
      updated = [mission, ...list];
    }
    saveJson(STORAGE_KEYS.SUPPLY_MISSIONS, updated);
    return updated;
  },

  updateSupplyMissionStatus(
    missionId: string,
    status: SupplyRunStatus,
    telemetry?: Partial<SupplyDeliveryMission>
  ): SupplyDeliveryMission[] {
    const list = this.getSupplyMissions();
    const updated = list.map((m) => {
      if (m.id === missionId) {
        return {
          ...m,
          ...telemetry,
          status,
        };
      }
      return m;
    });
    saveJson(STORAGE_KEYS.SUPPLY_MISSIONS, updated);
    return updated;
  },

  completeSupplyMission(
    missionId: string,
    proof: NonNullable<SupplyDeliveryMission['proofOfDelivery']>
  ): {
    updatedMissions: SupplyDeliveryMission[];
    updatedRequests: HandoverRequest[];
    updatedResources: ResourceItem[];
  } {
    const list = this.getSupplyMissions();
    let targetResourceId = '';
    const updatedMissions = list.map((m) => {
      if (m.id === missionId) {
        if (m.resourceId) targetResourceId = m.resourceId;
        return {
          ...m,
          status: 'delivered' as const,
          estimatedArrivalMinutes: 0,
          distanceRemainingKm: 0,
          currentSpeedKmh: 0,
          proofOfDelivery: proof,
        };
      }
      return m;
    });
    saveJson(STORAGE_KEYS.SUPPLY_MISSIONS, updatedMissions);

    // Sync Handover Requests
    const handoverList = this.getHandoverRequests();
    const updatedRequests = handoverList.map((h) => {
      if (targetResourceId && h.resourceId === targetResourceId) {
        return { ...h, status: 'Completed' as const, delivery_status: 'Delivered & Handed Over' };
      }
      return h;
    });
    saveJson(STORAGE_KEYS.HANDOVER_REQUESTS, updatedRequests);

    // Sync Resources
    const resourceList = this.getResources();
    const updatedResources = resourceList.map((r) => {
      if (targetResourceId && r.id === targetResourceId) {
        return { ...r, status: 'Redistributed' as const, trackingStatus: 'Delivered to Beneficiary' };
      }
      return r;
    });
    saveJson(STORAGE_KEYS.RESOURCES, updatedResources);

    // Sync to the backend database
    if (targetResourceId) {
      fetch(`/api/resources/${targetResourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Redistributed',
          trackingStatus: 'Delivered to Beneficiary',
        }),
      }).catch(() => {});
    }

    return { updatedMissions, updatedRequests, updatedResources };
  },

  // Reset to initial demo dataset
  resetToDefaults(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  // Backend API Synchronizations
  async syncWithBackend(): Promise<{ success: boolean; stats?: any }> {
    try {
      const res = await fetch('/api/db/stats');
      if (!res.ok) return { success: false };
      const stats = await res.json();
      return { success: true, stats };
    } catch {
      return { success: false };
    }
  },

  async persistResourceToBackend(item: ResourceItem): Promise<boolean> {
    try {
      const res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async persistHandoverToBackend(req: HandoverRequest): Promise<boolean> {
    try {
      const res = await fetch('/api/handover-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: req.id,
          resourceId: req.resourceId,
          resourceTitle: req.resourceTitle,
          requesterName: req.requesterName,
          requesterType: req.organization,
          requesterPhone: req.phone,
          purpose: req.purpose,
          requestDate: req.requestedDate,
          status: req.status,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async persistNgoAppToBackend(app: PendingNgoApplication): Promise<boolean> {
    try {
      const res = await fetch('/api/ngo-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async persistNgoAppAuditToBackend(appId: string, status: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/ngo-applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async persistBloodPledgeToBackend(pledge: BloodDonationPledge): Promise<boolean> {
    try {
      const res = await fetch('/api/blood-pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pledge.id,
          requestId: pledge.requestId,
          donorName: pledge.donorName,
          donorPhone: pledge.donorPhone,
          donorBloodGroup: pledge.bloodGroup,
          pledgedAt: pledge.pledgedDate,
          status: pledge.status,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

};
