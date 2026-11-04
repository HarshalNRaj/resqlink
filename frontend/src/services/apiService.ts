/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ResourceItem, UserRole } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  roles: UserRole[];
  activeRole: UserRole;
  isVerified: boolean;
  organizationName?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface NgoDossier {
  id: string;
  userId?: string;
  name: string;
  type: string;
  regNumber: string;
  darpanId?: string;
  panNumber?: string;
  address: string;
  city: string;
  state: string;
  contactPerson: string;
  phone: string;
  email: string;
  description?: string;
  beneficiaries: number;
  focusAreas?: string;
  immediateNeeds?: string;
  verificationStatus: 'Pending Verification' | 'Under Review' | 'Verified' | 'Rejected';
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  submittedDate: string;
  documents?: NgoDocMeta[];
}

export interface NgoDocMeta {
  id: string;
  ngoId: string;
  docType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: string;
  fileDataBase64?: string;
}

export interface BloodStockItem {
  id: string;
  bloodBankId: string;
  bloodBankName: string;
  city: string;
  address: string;
  phone: string;
  emergencyPhone?: string;
  bloodGroup: string;
  unitsAvailable: number;
  lastUpdated: string;
}

export interface VolunteerMission {
  id: string;
  title: string;
  volunteerId?: string;
  volunteerName?: string;
  volunteerPhone?: string;
  donorName: string;
  donorPhone?: string;
  pickupAddress: string;
  pickupInstructions?: string;
  recipientName: string;
  recipientPhone?: string;
  dropAddress: string;
  dropInstructions?: string;
  category: string;
  quantity: string;
  status: 'assigned' | 'at_pickup' | 'in_transit' | 'delivered';
  deliveryPin: string;
  otpVerified: boolean;
  deliveredAt?: string;
  notes?: string;
  createdAt: string;
}

const TOKEN_KEY = 'giveconnect_jwt_token';
const USER_KEY = 'giveconnect_auth_user';

class ApiServiceClass {
  private token: string | null = null;
  private currentUser: AuthUser | null = null;

  constructor() {
    this.token = localStorage.getItem(TOKEN_KEY);
    const cachedUser = localStorage.getItem(USER_KEY);
    if (cachedUser) {
      try {
        this.currentUser = JSON.parse(cachedUser);
      } catch {
        this.currentUser = null;
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.currentUser;
  }

  setSession(token: string, user: AuthUser) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Token invalid or expired
      this.clearSession();
      throw new Error('Your session has expired. Please sign in again.');
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Server request failed');
    }

    return data as T;
  }

  // --- Auth APIs ---
  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async register(payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    city: string;
    role: UserRole;
    roles?: UserRole[];
    organizationName?: string;
    legalType?: string;
  }): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async fetchMe(): Promise<AuthUser> {
    const user = await this.request<AuthUser>('/api/auth/me');
    this.currentUser = user;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }

  async switchRole(role: UserRole): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/api/auth/switch-role', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
    this.setSession(data.token, data.user);
    return data;
  }

  async getSeedAccounts(): Promise<{ accounts: any[] }> {
    return this.request<{ accounts: any[] }>('/api/auth/seed-users');
  }

  // --- NGO APIs ---
  async getNgoStatus(): Promise<{ profile: NgoDossier | null; documents: NgoDocMeta[] }> {
    return this.request<{ profile: NgoDossier | null; documents: NgoDocMeta[] }>('/api/ngo/status');
  }

  async registerNgo(payload: Partial<NgoDossier>): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>('/api/ngo/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async resubmitNgo(payload: Partial<NgoDossier>): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/ngo/resubmit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async uploadNgoDocument(payload: {
    ngoId?: string;
    docType: string;
    fileName: string;
    fileDataBase64: string;
    mimeType: string;
    fileSize: number;
  }): Promise<{ success: boolean; docId: string }> {
    return this.request<{ success: boolean; docId: string }>('/api/ngo/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Admin APIs ---
  async adminGetNgos(): Promise<{ applications: NgoDossier[] }> {
    return this.request<{ applications: NgoDossier[] }>('/api/admin/ngos');
  }

  async adminReviewNgo(
    ngoId: string,
    status: 'Verified' | 'Rejected' | 'Under Review',
    rejectionReason?: string
  ): Promise<{ success: boolean; status: string }> {
    return this.request<{ success: boolean; status: string }>(`/api/admin/ngos/${ngoId}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, rejectionReason }),
    });
  }

  async adminGetDocument(ngoId: string, docId: string): Promise<NgoDocMeta> {
    return this.request<NgoDocMeta>(`/api/admin/ngos/${ngoId}/documents/${docId}`);
  }

  // --- Blood Bank Inventory APIs ---
  async getBloodInventory(bloodBankId?: string): Promise<{ inventory: BloodStockItem[] }> {
    const url = bloodBankId ? `/api/blood-inventory?bloodBankId=${bloodBankId}` : '/api/blood-inventory';
    return this.request<{ inventory: BloodStockItem[] }>(url);
  }

  async updateBloodStock(
    bloodBankId: string,
    bloodGroup: string,
    unitsAvailable: number
  ): Promise<{ success: boolean; item: BloodStockItem }> {
    return this.request<{ success: boolean; item: BloodStockItem }>('/api/blood-inventory/update', {
      method: 'POST',
      body: JSON.stringify({ bloodBankId, bloodGroup, unitsAvailable }),
    });
  }

  // --- Volunteer Mission APIs ---
  async getVolunteerMissions(): Promise<{ missions: VolunteerMission[] }> {
    return this.request<{ missions: VolunteerMission[] }>('/api/volunteer/missions');
  }

  async updateMissionStatus(
    missionId: string,
    status: 'at_pickup' | 'in_transit' | 'delivered'
  ): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/volunteer/missions/${missionId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  async verifyDeliveryOtp(
    missionId: string,
    deliveryPin: string,
    receivedByName: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/api/volunteer/missions/${missionId}/verify-otp`,
      {
        method: 'POST',
        body: JSON.stringify({ deliveryPin, receivedByName, notes }),
      }
    );
  }

  async dispatchResource(payload: any): Promise<{
    success: boolean;
    missionId: string;
    deliveryPin: string;
    status: string;
    message: string;
  }> {
    return this.request<{
      success: boolean;
      missionId: string;
      deliveryPin: string;
      status: string;
      message: string;
    }>('/api/volunteer/dispatch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Database Persistence Operations ---
  async getResources(): Promise<any[]> {
    return this.request<any[]>('/api/resources');
  }

  async getMyResources(): Promise<any[]> {
    return this.request<any[]>('/api/resources/mine');
  }

  async createResource(resource: any): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>('/api/resources', {
      method: 'POST',
      body: JSON.stringify(resource),
    });
  }

  async updateResource(id: string, resource: Partial<ResourceItem>): Promise<{ success: boolean; item: ResourceItem }> {
    return this.request<{ success: boolean; item: ResourceItem }>(`/api/resources/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(resource),
    });
  }

  async deleteResource(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/api/resources/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async getHandoverRequests(): Promise<any[]> {
    return this.request<any[]>('/api/handover-requests');
  }

  async createHandoverRequest(req: any): Promise<{ success: boolean; id: string }> {
    return this.request<{ success: boolean; id: string }>('/api/handover-requests', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getBloodRequests(): Promise<any[]> {
    return this.request<any[]>('/api/blood-requests');
  }

  async createBloodPledge(pledge: any): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/blood-pledges', {
      method: 'POST',
      body: JSON.stringify(pledge),
    });
  }

  async getNgos(): Promise<any[]> {
    return this.request<any[]>('/api/ngos');
  }

  async getVolunteerTasks(): Promise<any[]> {
    return this.request<any[]>('/api/volunteer-tasks');
  }

}

export const apiService = new ApiServiceClass();
