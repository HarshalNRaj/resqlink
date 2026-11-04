/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { PageId } from '../types';
import { Button, Card, Modal } from '../components/common/UIComponents';
import {
  ShieldCheck,
  Building2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  Database,
  Clock,
  Download,
  Check,
  Lock,
} from 'lucide-react';
import { apiService, NgoDossier, NgoDocMeta } from '../services/apiService';

interface AdminDashboardPageProps {
  setCurrentPage: (page: PageId) => void;
  onOpenDbManager?: () => void;
}

export function AdminDashboardPage({
  setCurrentPage,
  onOpenDbManager,
}: AdminDashboardPageProps) {
  const [activeTab, setActiveTab] = useState<'verifications' | 'stats' | 'blood'>('verifications');
  const [applications, setApplications] = useState<NgoDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Inspection modal
  const [selectedNgo, setSelectedNgo] = useState<NgoDossier | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [rejectionModalOpen, setRejectionModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Certificate preview state
  const [viewingDoc, setViewingDoc] = useState<NgoDocMeta | null>(null);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const data = await apiService.adminGetNgos();
      setApplications(data.applications);
    } catch (err: any) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const filteredApplications = applications.filter((app) => {
    const matchesStatus =
      statusFilter === 'all' || app.verificationStatus === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleApprove = async (ngoId: string) => {
    setActionLoading(true);
    try {
      await apiService.adminReviewNgo(ngoId, 'Verified');
      await fetchApplications();
      setInspectModalOpen(false);
      setSelectedNgo(null);
    } catch (err: any) {
      alert(err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnderReview = async (ngoId: string) => {
    setActionLoading(true);
    try {
      await apiService.adminReviewNgo(ngoId, 'Under Review');
      await fetchApplications();
      if (selectedNgo && selectedNgo.id === ngoId) {
        setSelectedNgo({ ...selectedNgo, verificationStatus: 'Under Review' });
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) {
      setRejectionError('A clear statutory or compliance reason is required when rejecting an application.');
      return;
    }

    if (!selectedNgo) return;

    setActionLoading(true);
    setRejectionError(null);
    try {
      await apiService.adminReviewNgo(selectedNgo.id, 'Rejected', rejectionReason.trim());
      await fetchApplications();
      setRejectionModalOpen(false);
      setInspectModalOpen(false);
      setSelectedNgo(null);
      setRejectionReason('');
    } catch (err: any) {
      setRejectionError(err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDocument = async (ngoId: string, docId: string) => {
    try {
      const doc = await apiService.adminGetDocument(ngoId, docId);
      setViewingDoc(doc);
    } catch (err: any) {
      alert(err.message || 'Could not fetch document');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200/60">
              Administrative Governance & Audit
            </span>
            <span className="text-xs text-stone-500">Security & RBAC Enforcement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            NGO Verification & Institutional Oversight
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-2xl">
            Audit legal registration documents, inspect uploaded trust certificates, issue verified organization badges, or reject applications with recorded reasons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDbManager && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenDbManager}
              className="border-emerald-700 text-emerald-800 hover:bg-emerald-50 gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              <span>DB Inspector & Test Suite</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApplications}
            disabled={loading}
            className="text-stone-700 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('verifications')}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 transition-colors cursor-pointer ${
            activeTab === 'verifications'
              ? 'border-teal-900 text-teal-950'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          NGO Applications Queue ({applications.length})
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`pb-3 text-sm font-semibold border-b-2 px-3 transition-colors cursor-pointer ${
            activeTab === 'stats'
              ? 'border-teal-900 text-teal-950'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Platform Integrity & Role Audit
        </button>
      </div>

      {activeTab === 'verifications' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search NGO name, reg no, city..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs font-semibold text-stone-500 mr-1 shrink-0">Filter:</span>
              {[
                { id: 'all', label: 'All Applications' },
                { id: 'Pending Verification', label: 'Pending' },
                { id: 'Under Review', label: 'Under Review' },
                { id: 'Verified', label: 'Verified' },
                { id: 'Rejected', label: 'Rejected' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-teal-900 text-white font-semibold shadow-xs'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Applications Table */}
          <Card className="overflow-hidden border-stone-200">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Organization & Legal Type</th>
                    <th className="py-3 px-4">Reg Number / Darpan</th>
                    <th className="py-3 px-4">City / Contact</th>
                    <th className="py-3 px-4">Certificates Attached</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredApplications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-stone-500">
                        No NGO applications found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-stone-900">{app.name}</div>
                          <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-teal-800">{app.type}</span>
                            <span>•</span>
                            <span>{app.beneficiaries} Beneficiaries</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-mono text-stone-800 font-medium">{app.regNumber}</div>
                          {app.darpanId && (
                            <div className="text-[10px] text-stone-500 font-mono">
                              Darpan: {app.darpanId}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-stone-800 font-medium">{app.city}</div>
                          <div className="text-[11px] text-stone-500">{app.contactPerson} ({app.phone})</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-mono text-[11px]">
                            <FileText className="w-3 h-3 text-stone-500" />
                            <span>{app.documents?.length || 0} Docs</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {app.verificationStatus === 'Verified' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Verified</span>
                            </span>
                          )}
                          {app.verificationStatus === 'Pending Verification' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[11px]">
                              <Clock className="w-3 h-3 text-amber-700" />
                              <span>Pending</span>
                            </span>
                          )}
                          {app.verificationStatus === 'Under Review' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[11px]">
                              <RefreshCw className="w-3 h-3 text-blue-700 animate-spin" />
                              <span>Reviewing</span>
                            </span>
                          )}
                          {app.verificationStatus === 'Rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-[11px]">
                              <XCircle className="w-3 h-3 text-rose-700" />
                              <span>Rejected</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedNgo(app);
                              setInspectModalOpen(true);
                            }}
                            className="text-xs border-teal-800 text-teal-950 hover:bg-teal-50"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            <span>Inspect Dossier</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5 border-stone-200">
              <span className="text-xs text-stone-500 font-semibold uppercase">Accreditation Pipeline</span>
              <div className="text-3xl font-bold text-teal-950 font-serif mt-1">
                {applications.filter((a) => a.verificationStatus === 'Verified').length} / {applications.length}
              </div>
              <p className="text-xs text-stone-600 mt-1">Verified Organizations on Platform</p>
            </Card>

            <Card className="p-5 border-stone-200">
              <span className="text-xs text-stone-500 font-semibold uppercase">Pending Verification Queue</span>
              <div className="text-3xl font-bold text-amber-700 font-serif mt-1">
                {applications.filter((a) => a.verificationStatus === 'Pending Verification').length}
              </div>
              <p className="text-xs text-stone-600 mt-1">Applications awaiting administrative document inspection</p>
            </Card>

            <Card className="p-5 border-stone-200">
              <span className="text-xs text-stone-500 font-semibold uppercase">Rejected Dossiers</span>
              <div className="text-3xl font-bold text-rose-700 font-serif mt-1">
                {applications.filter((a) => a.verificationStatus === 'Rejected').length}
              </div>
              <p className="text-xs text-stone-600 mt-1">Declined with mandatory documented reasons</p>
            </Card>
          </div>

          <Card className="p-6 border-stone-200 space-y-3">
            <h3 className="text-base font-bold text-stone-900 font-serif">Security & Role Abstraction Enforcement</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              GiveConnect implements end-to-end backend role authorization via JWT Bearer tokens and MongoDB document storage. Only verified NGOs can claim resources, only assigned volunteers can view mission OTP pins, and only administrators have permission to review statutory documents.
            </p>
          </Card>
        </div>
      )}

      {/* Inspect Dossier Modal */}
      {selectedNgo && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => {
            setInspectModalOpen(false);
            setSelectedNgo(null);
            setViewingDoc(null);
          }}
          title={`Accreditation Inspection: ${selectedNgo.name}`}
          size="lg"
        >
          <div className="space-y-6 text-xs">
            {/* Header Status Bar */}
            <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
              <div>
                <span className="text-[10px] text-stone-500 uppercase font-semibold block">Dossier Status</span>
                <span className="font-bold text-sm text-stone-900">{selectedNgo.verificationStatus}</span>
              </div>
              {selectedNgo.reviewedBy && (
                <div className="text-right text-[11px] text-stone-600">
                  <span>Last Reviewed by: <strong>{selectedNgo.reviewedBy}</strong></span>
                  <span className="block text-stone-400 font-mono">{selectedNgo.reviewedAt}</span>
                </div>
              )}
            </div>

            {/* Rejection Reason if any */}
            {selectedNgo.verificationStatus === 'Rejected' && selectedNgo.rejectionReason && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                <strong className="block text-rose-950 font-bold mb-0.5">Mandatory Rejection Reason:</strong>
                {selectedNgo.rejectionReason}
              </div>
            )}

            {/* Organization Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                <span className="text-stone-500 block text-[10px]">Legal Structure</span>
                <span className="font-semibold text-stone-900">{selectedNgo.type}</span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                <span className="text-stone-500 block text-[10px]">Registration Number</span>
                <span className="font-mono font-semibold text-stone-900">{selectedNgo.regNumber}</span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                <span className="text-stone-500 block text-[10px]">NGO Darpan ID</span>
                <span className="font-mono font-semibold text-stone-900">{selectedNgo.darpanId || 'Not Provided'}</span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                <span className="text-stone-500 block text-[10px]">Organization PAN</span>
                <span className="font-mono font-semibold text-stone-900">{selectedNgo.panNumber || 'Not Provided'}</span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                <span className="text-stone-500 block text-[10px]">Authorized Signatory</span>
                <span className="font-semibold text-stone-900">{selectedNgo.contactPerson}</span>
              </div>
              <div className="p-2.5 bg-white border border-stone-200 rounded-lg">
                <span className="text-stone-500 block text-[10px]">Official Phone</span>
                <span className="font-semibold text-stone-900">{selectedNgo.phone}</span>
              </div>
            </div>

            {/* Address & Mission */}
            <div className="p-3 bg-white border border-stone-200 rounded-lg space-y-1.5">
              <div>
                <span className="text-stone-500 text-[10px] block">Physical Facility Address:</span>
                <span className="text-stone-800 font-medium">{selectedNgo.address}, {selectedNgo.city}, {selectedNgo.state}</span>
              </div>
              {selectedNgo.description && (
                <div className="pt-1.5 border-t border-stone-100">
                  <span className="text-stone-500 text-[10px] block">Sanctuary Mission:</span>
                  <p className="text-stone-700 leading-relaxed">{selectedNgo.description}</p>
                </div>
              )}
            </div>

            {/* Uploaded Verification Documents Section */}
            <div className="space-y-2.5">
              <h4 className="font-bold text-stone-900 uppercase tracking-wider text-[11px]">
                Uploaded Statutory Certificates & Deeds ({selectedNgo.documents?.length || 0})
              </h4>

              {(!selectedNgo.documents || selectedNgo.documents.length === 0) ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  No statutory certificates uploaded for this dossier yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedNgo.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-stone-50 border border-stone-200 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-4 h-4 text-teal-800 shrink-0" />
                        <div className="truncate">
                          <div className="font-semibold text-stone-900 truncate">{doc.docType}</div>
                          <div className="text-[11px] text-stone-500 font-mono truncate">{doc.fileName}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-stone-500 font-mono">
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(selectedNgo.id, doc.id)}
                          className="text-xs border-teal-800 text-teal-950 py-1 px-2.5"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          <span>View Doc</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Certificate Viewer Drawer / Box */}
            {viewingDoc && (
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-700" />
                    <span>Secure Document Verified: {viewingDoc.docType}</span>
                  </span>
                  <button
                    onClick={() => setViewingDoc(null)}
                    className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer font-bold"
                  >
                    Close Preview
                  </button>
                </div>
                <div className="p-3 bg-white rounded border border-teal-100 font-mono text-[11px] text-stone-600 break-all max-h-32 overflow-y-auto">
                  {viewingDoc.fileDataBase64
                    ? `[Verified Statutory File: ${viewingDoc.fileName} (${viewingDoc.mimeType})] Content held in MongoDB storage.`
                    : 'Certificate metadata confirmed.'}
                </div>
              </div>
            )}

            {/* Audit Decision Action Buttons */}
            <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectModalOpen(false)}
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {selectedNgo.verificationStatus !== 'Under Review' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionLoading}
                    onClick={() => handleUnderReview(selectedNgo.id)}
                    className="border-blue-400 text-blue-900 hover:bg-blue-50"
                  >
                    Mark Under Review
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => {
                    setRejectionReason('');
                    setRejectionError(null);
                    setRejectionModalOpen(true);
                  }}
                  className="border-rose-400 text-rose-800 hover:bg-rose-50"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  <span>Reject Application</span>
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  disabled={actionLoading || selectedNgo.verificationStatus === 'Verified'}
                  onClick={() => handleApprove(selectedNgo.id)}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Approve & Grant Verified Status</span>
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {rejectionModalOpen && selectedNgo && (
        <Modal
          isOpen={rejectionModalOpen}
          onClose={() => setRejectionModalOpen(false)}
          title={`Reject Accreditation: ${selectedNgo.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>
                Statutory rejection requires a documented reason. The applicant will be able to see this reason, correct their documents, and resubmit for verification.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Mandatory Rejection Reason *
              </label>
              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. The Trust Deed registration number did not match the Sub-Registrar seal, or the NGO PAN was not submitted..."
                className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              {rejectionError && <p className="text-xs text-rose-600 mt-1 font-semibold">{rejectionError}</p>}
            </div>

            <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectionModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={actionLoading}
                onClick={handleRejectConfirm}
                className="bg-rose-800 hover:bg-rose-700 text-white"
              >
                {actionLoading ? 'Recording Rejection...' : 'Confirm Rejection'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
