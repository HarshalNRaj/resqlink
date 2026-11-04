/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { Button, Card, NoticeBanner } from '../components/common/UIComponents';
import {
  Building2,
  ShieldCheck,
  FileText,
  UploadCloud,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { apiService, NgoDossier, NgoDocMeta } from '../services/apiService';

interface NgoRegisterPageProps {
  setCurrentPage: (page: PageId) => void;
  onSubmitApplication?: (app: any) => void;
}

export function NgoRegisterPage({ setCurrentPage }: NgoRegisterPageProps) {
  const [profile, setProfile] = useState<NgoDossier | null>(null);
  const [documents, setDocuments] = useState<NgoDocMeta[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingDoc, setUploadingDoc] = useState<boolean>(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'Trust' as 'Trust' | 'Society' | 'Section 8 Company',
    regNumber: '',
    darpanId: '',
    panNumber: '',
    address: '',
    city: 'Bengaluru',
    state: 'Karnataka',
    contactPerson: '',
    phone: '',
    email: '',
    description: '',
    beneficiaries: 85,
    focusAreas: 'Elderly Care, Nutritional Support',
    immediateNeeds: 'Adult diapers, Rice, Pulses, Blankets',
  });

  const [selectedDocType, setSelectedDocType] = useState<string>('Trust Registration Certificate');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'status' | 'form' | 'upload'>('status');

  const fetchNgoData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getNgoStatus();
      if (res.profile) {
        setProfile(res.profile);
        setDocuments(res.documents);
        setFormData({
          name: res.profile.name || '',
          type: (res.profile.type as any) || 'Trust',
          regNumber: res.profile.regNumber || '',
          darpanId: res.profile.darpanId || '',
          panNumber: res.profile.panNumber || '',
          address: res.profile.address || '',
          city: res.profile.city || 'Bengaluru',
          state: res.profile.state || 'Karnataka',
          contactPerson: res.profile.contactPerson || '',
          phone: res.profile.phone || '',
          email: res.profile.email || '',
          description: res.profile.description || '',
          beneficiaries: res.profile.beneficiaries || 50,
          focusAreas: res.profile.focusAreas || '',
          immediateNeeds: res.profile.immediateNeeds || '',
        });
      }
    } catch {
      // Not logged in or no profile yet
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNgoData();
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = 'Official organization name is required.';
    if (!formData.regNumber.trim()) errs.regNumber = 'Legal registration number is required.';
    if (!formData.address.trim()) errs.address = 'Full physical address is required.';
    if (!formData.contactPerson.trim()) errs.contactPerson = 'Authorized representative / Trustee name is required.';
    if (!formData.phone.trim() || formData.phone.length < 10) {
      errs.phone = 'Valid 10-digit phone number is required.';
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errs.email = 'Valid official email address is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegisterOrResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (profile && profile.verificationStatus === 'Rejected') {
        await apiService.resubmitNgo(formData);
      } else {
        await apiService.registerNgo(formData);
      }
      await fetchNgoData();
      setActiveTab('status');
    } catch (err: any) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    setUploadFeedback(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(',')[1] || '';
        await apiService.uploadNgoDocument({
          ngoId: profile?.id,
          docType: selectedDocType,
          fileName: file.name,
          fileDataBase64: base64,
          mimeType: file.type || 'application/pdf',
          fileSize: file.size,
        });

        setUploadFeedback(`Document "${file.name}" uploaded successfully and attached to your dossier.`);
        await fetchNgoData();
      } catch (err: any) {
        setUploadFeedback(`Upload failed: ${err.message}`);
      } finally {
        setUploadingDoc(false);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
              Institutional Accreditation
            </span>
            <span className="text-xs text-stone-500">Government & Statutory Compliance</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            NGO Accreditation & Verification Portal
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
            Organizations must submit valid statutory registration certificates. Applications are audited by administrators before receiving verified status and access to claimed resources.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage('ngos')}
          className="border-teal-800 text-teal-950 shrink-0"
        >
          <span>View Public Verified Directory</span>
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>

      {/* Notice Banner */}
      <NoticeBanner
        type="info"
        title="Zero-Tolerance Transparency Standard"
        message="Verification requires verifiable statutory documents (Trust Deed, Societies Act registration, or Section 8 Company Certificate, along with NGO PAN and Darpan). No NGO is verified automatically."
      />

      {/* Current Verification Status Display */}
      {profile && (
        <Card className="p-6 border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div>
              <span className="text-xs text-stone-500 block">Organization Dossier</span>
              <h2 className="text-xl font-bold text-stone-900 font-serif">{profile.name}</h2>
              <p className="text-xs text-stone-600">
                Reg No: <span className="font-mono font-semibold">{profile.regNumber}</span> • Type: {profile.type} • City: {profile.city}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {profile.verificationStatus === 'Verified' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                  <span>Verified NGO</span>
                </div>
              )}
              {profile.verificationStatus === 'Pending Verification' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                  <Clock className="w-4 h-4 text-amber-700" />
                  <span>Pending Admin Audit</span>
                </div>
              )}
              {profile.verificationStatus === 'Under Review' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 text-xs font-bold">
                  <RefreshCw className="w-4 h-4 text-blue-700 animate-spin" />
                  <span>Under Active Review</span>
                </div>
              )}
              {profile.verificationStatus === 'Rejected' && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-900 border border-rose-300 text-xs font-bold">
                  <XCircle className="w-4 h-4 text-rose-700" />
                  <span>Application Rejected</span>
                </div>
              )}
            </div>
          </div>

          {/* Rejection Alert & Resubmission Callout */}
          {profile.verificationStatus === 'Rejected' && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>Auditor Rejection Reason:</span>
              </div>
              <p className="text-xs text-rose-800 bg-white p-3 rounded-lg border border-rose-100 font-medium leading-relaxed">
                {profile.rejectionReason || 'Uploaded documentation was incomplete or mismatched statutory records.'}
              </p>
              <p className="text-xs text-rose-700">
                Please update your organization details or upload valid certificates below, then click &quot;Resubmit for Audit&quot;.
              </p>
            </div>
          )}

          {/* Audit Trail Details */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/60">
              <span className="text-stone-500 block">Submitted Date</span>
              <span className="font-semibold text-stone-800">{profile.submittedDate}</span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/60">
              <span className="text-stone-500 block">Statutory Type</span>
              <span className="font-semibold text-stone-800">{profile.type}</span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/60">
              <span className="text-stone-500 block">Beneficiaries</span>
              <span className="font-semibold text-stone-800">{profile.beneficiaries} Residents</span>
            </div>
            <div className="p-2.5 bg-stone-50 rounded-lg border border-stone-200/60">
              <span className="text-stone-500 block">Audited By</span>
              <span className="font-semibold text-stone-800 truncate block">
                {profile.reviewedBy || 'Pending Queue'}
              </span>
            </div>
          </div>

          {/* Uploaded Documents List */}
          <div className="mt-5 space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Attached Statutory Certificates ({documents.length})
            </h3>
            {documents.length === 0 ? (
              <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-lg border border-amber-200">
                No certificates uploaded yet. Please upload your legal registration documents below for administrative review.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 bg-stone-50 rounded-lg border border-stone-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-stone-800 truncate">{doc.docType}</div>
                        <div className="text-[11px] text-stone-500 font-mono truncate">{doc.fileName}</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded font-mono shrink-0">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Upload Certificate Card */}
      <Card className="p-6 border-stone-200 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-teal-950 font-serif">
            Upload Supporting Documents & Certificates
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Upload official PDF documents or scanned certificates to substantiate your legal registration.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Certificate Category
            </label>
            <select
              value={selectedDocType}
              onChange={(e) => setSelectedDocType(e.target.value)}
              className="w-full text-xs py-2 px-2.5 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="Trust Registration Certificate">Trust Registration Certificate</option>
              <option value="Society Registration Certificate">Society Registration Certificate</option>
              <option value="Section 8 Company Incorporation Certificate">Section 8 Incorporation Certificate</option>
              <option value="NGO PAN Document">NGO PAN Document</option>
              <option value="NITI Aayog NGO Darpan Registration">NITI Aayog NGO Darpan Registration</option>
              <option value="12A Tax Exemption Certificate">12A Tax Exemption Certificate</option>
              <option value="80G Certificate">80G Certificate</option>
              <option value="Audited Balance Sheet / Annual Report">Audited Annual Report</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Select Document (PDF, PNG, JPG)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                disabled={uploadingDoc}
                className="text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-900 file:text-white hover:file:bg-teal-800 cursor-pointer"
              />
              {uploadingDoc && (
                <span className="text-xs text-teal-800 font-semibold animate-pulse">
                  Uploading to MongoDB...
                </span>
              )}
            </div>
          </div>
        </div>

        {uploadFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs">
            {uploadFeedback}
          </div>
        )}
      </Card>

      {/* NGO Details Form (For registration or resubmission) */}
      <Card className="p-6 sm:p-8 border-stone-200">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-teal-950 font-serif">
            {profile ? 'Update Organization Details & Resubmit' : 'Complete NGO Verification Dossier'}
          </h2>
          <p className="text-xs text-stone-600 mt-1">
            Enter exact details as they appear on your legal trust deed or incorporation certificate.
          </p>
        </div>

        <form onSubmit={handleRegisterOrResubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Organization Legal Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Sneha Sanjeevani Eldercare Trust"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Legal Organization Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
              >
                <option value="Trust">Registered Charitable Trust (Trust Act)</option>
                <option value="Society">Registered Society (Societies Registration Act)</option>
                <option value="Section 8 Company">Section 8 Company (Companies Act 2013)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Statutory Registration Number *
              </label>
              <input
                type="text"
                value={formData.regNumber}
                onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                placeholder="e.g. KA-BLR-TR/2021/410"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
              {errors.regNumber && <p className="text-xs text-rose-600 mt-1">{errors.regNumber}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                NITI Aayog NGO Darpan ID (Optional)
              </label>
              <input
                type="text"
                value={formData.darpanId}
                onChange={(e) => setFormData({ ...formData, darpanId: e.target.value })}
                placeholder="e.g. KA/2022/019941"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Organization PAN Number
              </label>
              <input
                type="text"
                value={formData.panNumber}
                onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                placeholder="e.g. AAATS1294F"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Full Physical Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Door / Survey No, Street, Locality"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
              {errors.address && <p className="text-xs text-rose-600 mt-1">{errors.address}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                City *
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Bengaluru, Mysuru"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Authorized Signatory / Trustee Name *
              </label>
              <input
                type="text"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="e.g. Pooja Hegde"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
              {errors.contactPerson && <p className="text-xs text-rose-600 mt-1">{errors.contactPerson}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Contact Phone Number *
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98450 00000"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
              {errors.phone && <p className="text-xs text-rose-600 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Official Email Address *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="care@organization.org"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
              {errors.email && <p className="text-xs text-rose-600 mt-1">{errors.email}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Organization Description & Palliative Focus
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your sanctuary's primary community mission and beneficiary community..."
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting}
              className="bg-teal-900 hover:bg-teal-800"
            >
              {submitting
                ? 'Submitting to Administrative Audit...'
                : profile?.verificationStatus === 'Rejected'
                ? 'Resubmit Corrected Application'
                : 'Save & Submit Dossier for Verification'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
