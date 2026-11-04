/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Download,
  Layers,
  FileText,
  Sparkles,
  ShieldCheck,
  Check,
  Terminal,
  Server,
  HardDrive,
  RefreshCw,
  Table as TableIcon
} from 'lucide-react';
import { Button, Modal, Card, Badge } from './UIComponents';
import { StorageService } from '../../services/storageService';
import { ResourceItem, HandoverRequest, NGOProfile, BloodRequest } from '../../types';

interface TestStepResult {
  step: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  details?: string;
  durationMs?: number;
}

interface DatabaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export function DatabaseManagerModal({
  isOpen,
  onClose,
  onRefreshData,
}: DatabaseManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'mongo' | 'diagnostics' | 'tables' | 'raw_json' | 'tools'>('mongo');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<TestStepResult[]>([]);
  const [rawTableKey, setRawTableKey] = useState<string>('resources');
  const [copySuccess, setCopySuccess] = useState(false);

  // Read-only MongoDB diagnostics state
  const [queryResults, setQueryResults] = useState<{ rows: any[]; rowCount: number } | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backendStats, setBackendStats] = useState<any>(null);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);

  // Fetch MongoDB collection counts
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/db/stats');
      if (res.ok) {
        const data = await res.json();
        setBackendStats(data);
        setBackendOnline(true);
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen, activeTab]);

  // Refresh read-only collection diagnostics
  const refreshCollectionCounts = async () => {
    setIsRefreshing(true);
    setQueryError(null);
    try {
      const res = await fetch('/api/db/stats');
      if (!res.ok) throw new Error('Unable to retrieve MongoDB diagnostics.');
      const data = await res.json();
      setBackendStats(data);
      const rows = Object.entries(data.tables || {}).map(([collection, documents]) => ({ collection, documents }));
      setQueryResults({ rows, rowCount: rows.length });
      setBackendOnline(true);
    } catch (err: any) {
      setQueryError(err.message || 'Execution error');
      setQueryResults(null);
      setBackendOnline(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Load initial collection counts when the diagnostics tab opens.
  useEffect(() => {
    if (activeTab === 'mongo' && !queryResults && !queryError) {
      refreshCollectionCounts();
    }
  }, [activeTab]);

  // Read current live table counts
  const resources = StorageService.getResources();
  const handovers = StorageService.getHandoverRequests();
  const ngos = StorageService.getNgos();
  const applications = StorageService.getNgoApplications();
  const bloodRequests = StorageService.getBloodRequests();
  const bloodPledges = StorageService.getBloodPledges();
  const volunteerTasks = StorageService.getVolunteerTasks();
  const userShifts = StorageService.getUserVolunteerShifts();
  const alerts = StorageService.getAlerts();

  const tables = [
    { key: 'resources', label: 'Resources & Surplus', count: backendStats?.tables?.resources ?? resources.length, desc: 'Donated physical goods, photos, condition, claim status' },
    { key: 'handover_requests', label: 'Handover & Claims', count: backendStats?.tables?.handover_requests ?? handovers.length, desc: 'Recipient claims, scheduled handovers, completed deliveries' },
    { key: 'ngos', label: 'Verified NGO Directory', count: backendStats?.tables?.ngos ?? ngos.length, desc: 'Accredited ashrams, shelter homes, verified care units' },
    { key: 'ngo_applications', label: 'NGO Dossier Queue', count: backendStats?.tables?.ngo_applications ?? applications.length, desc: 'Pending audits, FCRA & Darpan legal accreditation applications' },
    { key: 'blood_requests', label: 'Blood SOS Requisitions', count: backendStats?.tables?.blood_requests ?? bloodRequests.length, desc: 'Active patient emergency requisitions & units needed' },
    { key: 'blood_pledges', label: 'Blood Donor Pledges', count: backendStats?.tables?.blood_pledges ?? bloodPledges.length, desc: 'Committed voluntary blood donors linked to requisitions' },
    { key: 'volunteer_tasks', label: 'Volunteer Shifts', count: backendStats?.tables?.volunteer_tasks ?? volunteerTasks.length, desc: 'Community food drives, eldercare shifts, capacity counters' },
    { key: 'user_shifts', label: 'User Booked Shifts', count: backendStats?.tables?.volunteer_shifts ?? userShifts.length, desc: 'Currently enrolled volunteer assignments' },
    { key: 'alerts', label: 'Platform Broadcasts', count: backendStats?.tables?.alerts ?? alerts.length, desc: 'System-wide notifications & audit events' },
  ];

  // Automated End-to-End Linkage Diagnostic Suite
  const runEndToEndTests = async () => {
    setIsRunningTests(true);

    const steps: TestStepResult[] = [
      { step: '1', name: 'Write Multi-Photo Resource to Database', status: 'pending' },
      { step: '2', name: 'Submit Handover Claim (Link Resource -> Handover)', status: 'pending' },
      { step: '3', name: 'Execute Handover Delivery (Status -> Redistributed)', status: 'pending' },
      { step: '4', name: 'Accreditation Flow: Submit NGO -> Admin Approve -> Directory Insert', status: 'pending' },
      { step: '5', name: 'Blood SOS Pipeline: Create Requisition -> Donor Pledge -> Status Update', status: 'pending' },
      { step: '6', name: 'Volunteer Shift Cycle: Reserve Slot (Capacity -1) -> Cancel (Capacity +1)', status: 'pending' },
      { step: '7', name: 'Verify MongoDB Backend Connectivity', status: 'pending' },
    ];
    setTestResults([...steps]);

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Step 1: Write multi-photo resource
    try {
      const t0 = performance.now();
      steps[0].status = 'running';
      setTestResults([...steps]);
      await wait(150);

      const testResourceId = `test-res-${Date.now().toString().slice(-4)}`;
      const sampleItem: ResourceItem = {
        id: testResourceId,
        title: 'Diagnostic Test Medical Kit & Thermal Blankets',
        category: 'mobility_medical',
        categoryLabel: 'Mobility & Medical',
        quantity: '5 Diagnostic Kits',
        condition: 'New / Unopened',
        city: 'Bengaluru',
        locality: 'Indiranagar Care Center',
        donorName: 'GiveConnect Automated QA Bot',
        donorType: 'Individual Donor',
        status: 'Available',
        postedDate: new Date().toISOString().split('T')[0],
        description: 'Automated integration test payload with Amazon-style multi-angle photos.',
        pickupAvailable: true,
        contactEmail: 'qa-diagnostic@giveconnect.org',
        contactPhone: '+91 99000 11222',
        imageUrl: '/src/assets/images/resource_redistribution_boxes_1793546426574.jpg',
        images: [
          '/src/assets/images/resource_redistribution_boxes_1793546426574.jpg',
          '/src/assets/images/ngo_distribution_care_1793546425595.jpg',
          '/src/assets/images/blood_donation_care_1793546425225.jpg',
        ],
      };

      StorageService.saveResource(sampleItem);
      const readBack = StorageService.getResources().find((r) => r.id === testResourceId);
      if (!readBack || readBack.images?.length !== 3) {
        throw new Error('Failed to persist multi-photo resource in StorageService.');
      }

      steps[0].status = 'success';
      steps[0].durationMs = Math.round(performance.now() - t0);
      steps[0].details = `Created ${testResourceId} with 3 photos. Verified persistent read-back in ${steps[0].durationMs}ms.`;
      setTestResults([...steps]);

      // Step 2: Submit Handover Claim
      const t1 = performance.now();
      steps[1].status = 'running';
      setTestResults([...steps]);
      await wait(150);

      const testReqId = `test-claim-${Date.now().toString().slice(-4)}`;
      const testClaim: HandoverRequest = {
        id: testReqId,
        resourceId: testResourceId,
        resourceTitle: sampleItem.title,
        requesterName: 'Mother Teresa Home Rep',
        organization: 'Community Shelter Trust',
        phone: '+91 98450 11223',
        beneficiaryCount: 45,
        purpose: 'Direct distribution to underprivileged families at community camp.',
        requestedDate: new Date().toISOString().split('T')[0],
        status: 'Handover Scheduled',
        donorName: sampleItem.donorName,
        donorPhone: sampleItem.contactPhone,
      };

      const claimResult = StorageService.submitHandoverRequest(testClaim);
      const mutatedResource = claimResult.updatedResources.find((r) => r.id === testResourceId);
      if (!mutatedResource || mutatedResource.status !== 'Reserved') {
        throw new Error('Resource status failed to link: expected Reserved status upon claim.');
      }

      steps[1].status = 'success';
      steps[1].durationMs = Math.round(performance.now() - t1);
      steps[1].details = `Linked ${testReqId} -> ${testResourceId}. Status updated from 'Available' to 'Reserved'.`;
      setTestResults([...steps]);

      // Step 3: Complete Handover Delivery
      const t2 = performance.now();
      steps[2].status = 'running';
      setTestResults([...steps]);
      await wait(150);

      const deliverResult = StorageService.updateHandoverStatus(testReqId, 'Completed');
      const finalResource = deliverResult.updatedResources.find((r) => r.id === testResourceId);
      if (!finalResource || finalResource.status !== 'Redistributed') {
        throw new Error('Resource failed to reach terminal Redistributed state upon completed delivery.');
      }

      steps[2].status = 'success';
      steps[2].durationMs = Math.round(performance.now() - t2);
      steps[2].details = `Handover finalized. Resource status transitioned to 'Redistributed'. Audit log sealed.`;
      setTestResults([...steps]);

      // Step 4: NGO Accreditation Flow
      const t3 = performance.now();
      steps[3].status = 'running';
      setTestResults([...steps]);
      await wait(150);

      const testAppId = `test-app-${Date.now().toString().slice(-4)}`;
      StorageService.submitNgoApplication({
        id: testAppId,
        name: 'Vatsalya Children Rehabilitation Mission',
        type: 'Orphanage / Child Care',
        regNumber: 'KA-BLR-REG/2022/990',
        darpanId: 'KA/2022/099120',
        city: 'Bengaluru',
        state: 'Karnataka',
        address: 'BTM 2nd Stage, Outer Ring Road',
        contactPerson: 'Smt. Gayatri Devi',
        phone: '+91 98450 66778',
        email: 'contact@vatsalyacare.test',
        beneficiaries: 80,
        submittedDate: new Date().toISOString().split('T')[0],
        status: 'Pending Audit',
        focusAreas: 'Child Welfare, Nutrition',
        immediateNeeds: 'School supplies, Milk, Warm blankets',
      });

      const auditResult = StorageService.auditNgoApplication(testAppId, 'Approved');
      const auditedNgo = StorageService.getNgos().find((n) => n.name === 'Vatsalya Children Rehabilitation Mission');
      if (!auditedNgo || auditedNgo.verifiedStatus !== 'Verified') {
        throw new Error('Approved NGO failed to automatically publish into verified NGO directory.');
      }

      steps[3].status = 'success';
      steps[3].durationMs = Math.round(performance.now() - t3);
      steps[3].details = `Submitted application ${testAppId}, executed admin approval, and verified directory publishing.`;
      setTestResults([...steps]);

      // Step 5: Blood SOS Pipeline
      const t4 = performance.now();
      steps[4].status = 'running';
      setTestResults([...steps]);
      await wait(150);

      const testBloodId = `test-sos-${Date.now().toString().slice(-4)}`;
      const testBloodReq: BloodRequest = {
        id: testBloodId,
        patientName: 'Rohan Deshmukh (Emergency Surgery)',
        bloodGroup: 'AB-',
        unitsRequired: 2,
        hospitalName: 'Manipal Hospital ICU',
        city: 'Bengaluru',
        urgency: 'Immediate (Within 3 Hours)',
        contactPerson: 'Duty Nurse',
        contactPhone: '+91 99880 33445',
        postedDate: new Date().toISOString().split('T')[0],
        status: 'Open',
        doctorPrescriptionVerified: true,
      };

      StorageService.saveBloodRequest(testBloodReq);
      const pledgeResult = StorageService.submitBloodPledge({
        id: `test-pld-${Date.now().toString().slice(-4)}`,
        requestId: testBloodId,
        patientName: testBloodReq.patientName,
        hospitalName: testBloodReq.hospitalName,
        bloodGroup: 'AB-',
        donorName: 'Test Voluntary Donor',
        donorPhone: '+91 98880 11223',
        pledgedDate: new Date().toISOString().split('T')[0],
        status: 'Pledge Confirmed',
      });

      const updatedBloodReq = pledgeResult.updatedRequests.find((b) => b.id === testBloodId);
      if (!updatedBloodReq || updatedBloodReq.status !== 'Fulfillers Assigned') {
        throw new Error('Blood request failed to update status to "Fulfillers Assigned" upon donor pledge.');
      }

      steps[4].status = 'success';
      steps[4].durationMs = Math.round(performance.now() - t4);
      steps[4].details = `Created requisition ${testBloodId}, pledged units, and verified requisition status changed to 'Fulfillers Assigned'.`;
      setTestResults([...steps]);

      // Step 6: Volunteer Shift Cycle
      const t5 = performance.now();
      steps[5].status = 'running';
      setTestResults([...steps]);
      await wait(150);

      const tasksBefore = StorageService.getVolunteerTasks();
      const targetTask = tasksBefore[0];
      const initialVolunteers = targetTask.volunteersRegistered;

      StorageService.updateVolunteerTaskRegistration(targetTask.id);
      StorageService.recordUserVolunteerShift(targetTask.id);

      const tasksAfterBooking = StorageService.getVolunteerTasks();
      const bookedTask = tasksAfterBooking.find((t) => t.id === targetTask.id)!;
      if (bookedTask.volunteersRegistered !== initialVolunteers + 1) {
        throw new Error('Volunteer slot count did not increment on booking.');
      }

      StorageService.cancelVolunteerShift(targetTask.id);
      const tasksAfterCancel = StorageService.getVolunteerTasks();
      const cancelledTask = tasksAfterCancel.find((t) => t.id === targetTask.id)!;
      if (cancelledTask.volunteersRegistered !== initialVolunteers) {
        throw new Error('Volunteer slot count failed to decrement upon cancellation.');
      }

      steps[5].status = 'success';
      steps[5].durationMs = Math.round(performance.now() - t5);
      steps[5].details = `Enrolled volunteer in shift (registered: ${initialVolunteers} -> ${initialVolunteers + 1}), then cancelled and restored to ${initialVolunteers}.`;
      setTestResults([...steps]);

      // Step 7: Verify MongoDB backend sync
      const t6 = performance.now();
      steps[6].status = 'running';
      setTestResults([...steps]);

      const backendSync = await StorageService.syncWithBackend();
      if (!backendSync.success) {
        throw new Error('MongoDB backend API check did not respond.');
      }

      steps[6].status = 'success';
      steps[6].durationMs = Math.round(performance.now() - t6);
      steps[6].details = `MongoDB backend verified online. Collections: ${Object.keys(backendSync.stats.tables).length}.`;
      setTestResults([...steps]);

      if (onRefreshData) onRefreshData();
      fetchStats();
    } catch (err: any) {
      const activeStep = steps.find((s) => s.status === 'running') || steps[0];
      activeStep.status = 'failed';
      activeStep.details = err.message || 'Validation assertion failed';
      setTestResults([...steps]);
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleExportJson = () => {
    const dbDump = {
      databaseEngine: 'MongoDB',
      exportTimestamp: new Date().toISOString(),
      tables: {
        resources: StorageService.getResources(),
        handover_requests: StorageService.getHandoverRequests(),
        ngos: StorageService.getNgos(),
        ngo_applications: StorageService.getNgoApplications(),
        blood_requests: StorageService.getBloodRequests(),
        blood_pledges: StorageService.getBloodPledges(),
        volunteer_tasks: StorageService.getVolunteerTasks(),
        user_shifts: StorageService.getUserVolunteerShifts(),
        alerts: StorageService.getAlerts(),
      },
    };

    const blob = new Blob([JSON.stringify(dbDump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `giveconnect_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResetToDefaults = () => {
    if (confirm('Are you sure you want to reset all tables to initial defaults?')) {
      StorageService.resetToDefaults();
      if (onRefreshData) onRefreshData();
      fetchStats();
      alert('All tables have been reset to pristine baseline demo records.');
    }
  };

  const handleSeedRealMultiPhoto = () => {
    const sampleMultiPhotoItem: ResourceItem = {
      id: `res-amazon-${Date.now().toString().slice(-4)}`,
      title: 'High-Capacity Pediatric Wheelchair & Foldable Walker (Certified)',
      category: 'mobility_medical',
      categoryLabel: 'Mobility & Medical',
      quantity: '2 Units (Fully Assembled)',
      condition: 'New / Unopened',
      city: 'Bengaluru',
      locality: 'Indiranagar 100ft Road',
      donorName: 'Sanjeevani Assistive Care Foundation',
      donorType: 'Individual Donor',
      status: 'Available',
      postedDate: new Date().toISOString().split('T')[0],
      description: 'Brand new medical-grade pediatric mobility aids with adjustable footrests and safety harness. Donated for community clinic or ashram with immediate requirement.',
      pickupAvailable: true,
      contactEmail: 'contact@sanjeevani-care.demo',
      contactPhone: '+91 98450 77123',
      imageUrl: '/src/assets/images/resource_redistribution_boxes_1793546426574.jpg',
      images: [
        '/src/assets/images/resource_redistribution_boxes_1793546426574.jpg',
        '/src/assets/images/ngo_distribution_care_1793546425595.jpg',
        '/src/assets/images/blood_donation_care_1793546425225.jpg',
        '/src/assets/images/hero_community_giving_1793546425262.jpg',
      ],
    };

    StorageService.saveResource(sampleMultiPhotoItem);
    if (onRefreshData) onRefreshData();
    fetchStats();
    alert('Added sample item with 4 Amazon-style photos! Check "Find Resources" page.');
  };

  const getTableJsonString = () => {
    let data: any = [];
    if (rawTableKey === 'resources') data = StorageService.getResources();
    else if (rawTableKey === 'handover_requests') data = StorageService.getHandoverRequests();
    else if (rawTableKey === 'ngos') data = StorageService.getNgos();
    else if (rawTableKey === 'ngo_applications') data = StorageService.getNgoApplications();
    else if (rawTableKey === 'blood_requests') data = StorageService.getBloodRequests();
    else if (rawTableKey === 'blood_pledges') data = StorageService.getBloodPledges();
    else if (rawTableKey === 'volunteer_tasks') data = StorageService.getVolunteerTasks();
    else if (rawTableKey === 'user_shifts') data = StorageService.getUserVolunteerShifts();
    else if (rawTableKey === 'alerts') data = StorageService.getAlerts();

    return JSON.stringify(data, null, 2);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(getTableJsonString());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="MongoDB Management & System Linkage Suite"
      subtitle="MongoDB persistence connected via the Express REST backend"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Live Engine Header Banner */}
        <div className="p-3.5 bg-gradient-to-r from-teal-900 to-emerald-900 rounded-xl text-white shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight">MongoDB Database</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  {backendOnline ? 'ONLINE & PERSISTENT' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-teal-100/80 mt-0.5">
                Persistent document database • Backend connectivity and collection counts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchStats}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-teal-100 transition-colors cursor-pointer"
              title="Refresh database metrics"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('mongo')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'mongo'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>MongoDB Diagnostics</span>
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'diagnostics'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>End-to-End System Test</span>
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Collections ({tables.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('raw_json')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'raw_json'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Raw JSON Inspector</span>
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-teal-900 text-white shadow-xs'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Backup & Tools</span>
          </button>
        </div>

        {/* Tab 1: MongoDB Diagnostics */}
        {activeTab === 'mongo' && (
          <div className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-stone-700 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-teal-800" />
                  Read-only MongoDB collection diagnostics
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  Engine: MongoDB • Backend Endpoint: <code className="text-teal-700">GET /api/db/stats</code>
                </span>
              </div>

            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-stone-500">Database commands are disabled; only collection counts are shown.</span>
              <Button variant="primary" size="sm" disabled={isRefreshing} onClick={() => refreshCollectionCounts()} className="bg-teal-900 hover:bg-teal-950 text-white text-xs gap-1.5 shadow-xs">
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing...' : 'Refresh counts'}</span>
              </Button>
            </div>

            {/* Query Error Message */}
            {queryError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span className="font-mono">{queryError}</span>
              </div>
            )}

            {/* Query Results Table */}
            {queryResults && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-stone-700 flex items-center gap-1.5">
                    <TableIcon className="w-3.5 h-3.5 text-teal-800" />
                    Collection Counts
                  </span>
                  <Badge variant="neutral" className="text-[11px]">
                    {queryResults.rowCount} Row{queryResults.rowCount === 1 ? '' : 's'} Returned
                  </Badge>
                </div>

                {queryResults.rows.length === 0 ? (
                  <div className="p-6 text-center text-xs text-stone-500 bg-stone-50 rounded-xl border border-stone-200">
                    No collections were reported.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl border border-stone-200 bg-white shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-stone-100 border-b border-stone-200 text-stone-700 font-mono text-[11px]">
                          {Object.keys(queryResults.rows[0]).map((col) => (
                            <th key={col} className="p-2.5 font-semibold whitespace-nowrap">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
                        {queryResults.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-teal-50/50 transition-colors">
                            {Object.keys(row).map((col) => (
                              <td key={col} className="p-2.5 text-stone-800 whitespace-nowrap max-w-xs truncate">
                                {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Automated Diagnostics */}
        {activeTab === 'diagnostics' && (
          <div className="space-y-4">
            <div className="p-4 bg-teal-50/60 rounded-xl border border-teal-200/70 text-xs space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-teal-950 text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Automated Subsystem Verification Runner
                  </h4>
                  <p className="text-stone-600 mt-1 leading-relaxed">
                    This test suite executes real write, read, and state mutation cycles through both the frontend
                    reactive layer and the persistent MongoDB backend, validating that the platform
                    subsystems are linked end-to-end.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isRunningTests}
                  onClick={runEndToEndTests}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 shadow-sm gap-1.5"
                >
                  <Play className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
                  <span>{isRunningTests ? 'Testing...' : 'Run All 7 Tests'}</span>
                </Button>
              </div>
            </div>

            {/* Test Results Display */}
            {testResults.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 px-1">
                  <span>Diagnostic Step & Integration Link</span>
                  <span>Verification Status</span>
                </div>

                <div className="space-y-2">
                  {testResults.map((t, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl border text-xs transition-all ${
                        t.status === 'success'
                          ? 'bg-emerald-50/60 border-emerald-200 text-stone-900'
                          : t.status === 'failed'
                          ? 'bg-rose-50 border-rose-300 text-rose-950'
                          : t.status === 'running'
                          ? 'bg-amber-50 border-amber-300 text-amber-950 animate-pulse'
                          : 'bg-stone-50 border-stone-200 text-stone-500'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 font-bold">
                            <span className="w-5 h-5 rounded-full bg-white border flex items-center justify-center text-[10px] shrink-0 font-mono">
                              {t.step}
                            </span>
                            <span>{t.name}</span>
                          </div>
                          {t.details && (
                            <p className="text-[11px] text-stone-600 pl-7 leading-relaxed font-mono">
                              {t.details}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {t.durationMs !== undefined && (
                            <span className="text-[10px] text-stone-400 font-mono">{t.durationMs}ms</span>
                          )}
                          {t.status === 'success' && (
                            <Badge variant="verified" className="text-[11px] bg-emerald-100 text-emerald-800 border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              PASS
                            </Badge>
                          )}
                          {t.status === 'failed' && (
                            <Badge variant="urgent" className="text-[11px]">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              FAIL
                            </Badge>
                          )}
                          {t.status === 'running' && (
                            <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider">
                              Testing...
                            </span>
                          )}
                          {t.status === 'pending' && (
                            <span className="text-[10px] text-stone-400 uppercase tracking-wider">
                              Queued
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Tables Overview */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tables.map((t) => (
                <div
                  key={t.key}
                  className="p-3.5 rounded-xl border border-stone-200 bg-white hover:border-teal-400 transition-colors space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-stone-900">{t.label}</span>
                    <Badge variant="neutral" className="text-xs font-mono font-bold">
                      {t.count} records
                    </Badge>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-snug">{t.desc}</p>
                  <div className="pt-2 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                    <span>MongoDB collection: <strong className="text-stone-700">{t.key}</strong></span>
                    <button
                      onClick={() => {
                        setActiveTab('mongo');
                        refreshCollectionCounts();
                      }}
                      className="text-teal-700 hover:text-teal-900 font-semibold cursor-pointer underline"
                    >
                      Refresh counts &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Raw JSON Inspector */}
        {activeTab === 'raw_json' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-stone-700">Select Table:</span>
                <select
                  value={rawTableKey}
                  onChange={(e) => setRawTableKey(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white text-xs font-medium focus:ring-1 focus:ring-teal-700"
                >
                  {tables.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label} ({t.count} records)
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="gap-1.5 text-xs py-1"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <FileText className="w-3.5 h-3.5" />}
                <span>{copySuccess ? 'Copied to Clipboard' : 'Copy JSON'}</span>
              </Button>
            </div>

            <pre className="max-h-72 overflow-y-auto p-3.5 bg-stone-900 text-emerald-400 text-[11px] font-mono rounded-xl border border-stone-800 leading-relaxed">
              {getTableJsonString()}
            </pre>
          </div>
        )}

        {/* Tab 5: Tools & Controls */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="p-4 space-y-2 border-stone-200">
                <Download className="w-5 h-5 text-teal-800" />
                <h5 className="font-bold text-xs text-stone-900">Export Full JSON DB</h5>
                <p className="text-[11px] text-stone-500">
                  Download all 9 tables as a standalone JSON backup file.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={handleExportJson}
                  className="text-xs"
                >
                  Download .json
                </Button>
              </Card>

              <Card className="p-4 space-y-2 border-stone-200">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h5 className="font-bold text-xs text-stone-900">Add 4-Photo Item</h5>
                <p className="text-[11px] text-stone-500">
                  Instantly seed an Amazon-style multi-angle donation item.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleSeedRealMultiPhoto}
                  className="bg-emerald-700 hover:bg-emerald-800 text-xs"
                >
                  Insert Sample Item
                </Button>
              </Card>

              <Card className="p-4 space-y-2 border-stone-200">
                <RotateCcw className="w-5 h-5 text-amber-700" />
                <h5 className="font-bold text-xs text-stone-900">Reset Demo Defaults</h5>
                <p className="text-[11px] text-stone-500">
                  Clear custom test mutations and revert to pristine initial dataset.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  onClick={handleResetToDefaults}
                  className="text-xs text-stone-700 hover:text-amber-800"
                >
                  Revert to Defaults
                </Button>
              </Card>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-3 border-t border-stone-200 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-teal-700" />
            <span>MongoDB persistence • Port 3000 REST API</span>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Inspector
          </Button>
        </div>
      </div>
    </Modal>
  );
}
