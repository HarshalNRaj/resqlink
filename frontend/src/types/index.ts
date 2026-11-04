/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole =
  | 'donor'
  | 'recipient'
  | 'ngo'
  | 'volunteer'
  | 'blood_donor'
  | 'blood_bank'
  | 'admin'
  | 'ngo_rep'
  | 'blood_bank_officer';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  city: string;
  state: string;
  organizationName?: string;
  isVerified: boolean;
  joinedDate: string;
  avatarUrl?: string;
}

export type ResourceCategory =
  | 'food_rations'
  | 'clothing_blankets'
  | 'books_education'
  | 'mobility_medical'
  | 'hygiene_sanitation'
  | 'infant_care';

export type ItemCondition = 'New / Unopened' | 'Gently Used' | 'Good Condition';

export interface ResourceItem {
  id: string;
  donorId?: string;
  title: string;
  category: ResourceCategory;
  categoryLabel: string;
  quantity: string;
  condition: ItemCondition;
  city: string;
  locality: string;
  donorName: string;
  donorType: 'Individual Donor' | 'Corporate Donor' | 'Community Partner';
  status: 'Available' | 'Reserved' | 'Redistributed';
  postedDate: string;
  expiryOrUrgency?: string;
  description: string;
  pickupAvailable: boolean;
  contactEmail: string;
  contactPhone: string;
  imageUrl?: string;
  images?: string[];
  reservedBy?: string;
}

export interface HandoverRequest {
  id: string;
  resourceId: string;
  resourceTitle: string;
  requesterName: string;
  organization?: string;
  phone: string;
  beneficiaryCount: number;
  purpose: string;
  requestedDate: string;
  status: 'Pending Coordinator Review' | 'Handover Scheduled' | 'Completed';
  donorName: string;
  donorPhone: string;
  imageUrl?: string;
  deliveryPin?: string;
}

export interface BloodDonationPledge {
  id: string;
  requestId: string;
  patientName: string;
  hospitalName: string;
  bloodGroup: BloodGroup;
  donorName: string;
  donorPhone: string;
  pledgedDate: string;
  status: 'Pledge Confirmed' | 'Transfusion Completed';
}

export interface NGOProfile {
  id: string;
  name: string;
  type: 'Ashram' | 'Shelter Home' | 'Child Care Trust' | 'Elderly Care Sanctuary' | 'Community Relief';
  registrationNumber: string;
  darpanId?: string;
  verifiedStatus: 'Verified' | 'Pending Verification' | 'Under Review';
  city: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  yearEstablished: number;
  beneficiaryCount: number;
  focusAreas: string[];
  activeNeeds: string[];
  summary: string;
  headOfOrganization: string;
  imageUrl?: string;
}

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface BloodStockItem {
  bloodGroup: BloodGroup;
  unitsAvailable: number;
  status: 'Sufficient' | 'Moderate' | 'Critical Shortage';
  lastUpdated: string;
}

export interface BloodBank {
  id: string;
  name: string;
  licenseNumber: string;
  category: 'Government Hospital' | 'Red Cross Blood Center' | 'Charitable Trust' | 'Private Multi-specialty';
  city: string;
  state: string;
  address: string;
  emergencyPhone: string;
  generalPhone: string;
  email: string;
  operatingHours: string;
  is24x7: boolean;
  componentSeparationAvailable: boolean;
  inventory: BloodStockItem[];
}

export interface BloodRequest {
  id: string;
  patientName: string;
  hospitalName: string;
  city: string;
  bloodGroup: BloodGroup;
  unitsRequired: number;
  urgency: 'Immediate (Within 3 Hours)' | 'Urgent (Within 12 Hours)' | 'Standard (Within 24 Hours)';
  contactPerson: string;
  contactPhone: string;
  postedDate: string;
  status: 'Open' | 'Fulfillers Assigned' | 'Fulfilled';
  doctorPrescriptionVerified: boolean;
}

export interface VolunteerTask {
  id: string;
  title: string;
  organization: string;
  category: 'Sorting & Packaging' | 'Field Distribution' | 'Blood Donation Drive' | 'Tutoring & Childcare' | 'Elderly Support';
  city: string;
  locality: string;
  date: string;
  duration: string;
  volunteersNeeded: number;
  volunteersRegistered: number;
  skillsRequired: string[];
  description: string;
  coordinatorName: string;
  coordinatorPhone: string;
}

export type SupplyRunStatus =
  | 'assigned'
  | 'at_pickup'
  | 'in_transit'
  | 'near_destination'
  | 'delivered';

export interface RouteCheckpoint {
  id: string;
  name: string;
  locality: string;
  completed: boolean;
  timestamp?: string;
  distanceFromPickupKm: number;
}

export interface SupplyDeliveryMission {
  id: string;
  trackingNumber: string;
  resourceId?: string;
  resourceTitle: string;
  category: string;
  quantity: string;
  imageUrl?: string;
  priority: 'Emergency High' | 'Standard Priority' | 'Cold Chain / Perishable';
  
  // Pickup
  donorName: string;
  pickupLocation: string;
  pickupAddress: string;
  pickupPhone: string;
  pickupInstructions?: string;
  pickupCoords: { x: number; y: number; lat: number; lng: number };

  // Recipient Drop
  recipientName: string;
  recipientType: 'Ashram' | 'Shelter Home' | 'Child Care Trust' | 'Hospital Trauma Center' | 'Community Kitchen';
  dropLocation: string;
  dropAddress: string;
  recipientPhone: string;
  dropInstructions?: string;
  dropCoords: { x: number; y: number; lat: number; lng: number };

  // Volunteer Champion
  volunteer: {
    id: string;
    name: string;
    phone: string;
    vehicleType: 'EV Scooter (Ather 450X)' | 'Cargo Auto (Piaggio Ape)' | 'Relief Van (Mahindra Bolero)' | 'Motorcycle (Hero Splendor)';
    vehicleNumber: string;
    rating: number;
    deliveriesCount: number;
    avatarUrl?: string;
    isVerified: boolean;
    batteryOrFuel: number;
  };

  status: SupplyRunStatus;
  startedAt?: string;
  estimatedArrivalMinutes: number;
  distanceRemainingKm: number;
  totalDistanceKm: number;
  currentSpeedKmh: number;
  headingDeg: number;

  currentPosition: {
    x: number;
    y: number;
    lat: number;
    lng: number;
  };

  deliveryPin: string;
  checkpoints: RouteCheckpoint[];
  proofOfDelivery?: {
    receivedByName: string;
    signatureReceived: boolean;
    photoUrl?: string;
    deliveredAt: string;
    notes?: string;
  };
}

export type PageId =
  | 'home'
  | 'auth'
  | 'donate'
  | 'resources'
  | 'ngos'
  | 'ngo-register'
  | 'blood-banks'
  | 'blood-inventory'
  | 'volunteers'
  | 'supply-tracker'
  | 'user-dashboard'
  | 'admin-dashboard';
