/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PageId, ResourceItem, ResourceCategory, HandoverRequest } from '../types';
import { Button, Card, MetadataRow, Modal } from '../components/common/UIComponents';
import {
  Search,
  Filter,
  CheckCircle2,
  Phone,
  Mail,
  MapPin,
  Eye,
  ShieldCheck,
  Package,
  Layers,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';

interface ResourcesPageProps {
  resources: ResourceItem[];
  setCurrentPage: (page: PageId) => void;
  onRequestResource?: (request: HandoverRequest) => void;
}

export function ResourcesPage({
  resources,
  setCurrentPage,
  onRequestResource,
}: ResourcesPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');

  // Amazon-style Detailed Product Inspector Modal State
  const [inspectingItem, setInspectingItem] = useState<ResourceItem | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  // Request Item Modal State
  const [activeRequestItem, setActiveRequestItem] = useState<ResourceItem | null>(null);
  const [requestFormData, setRequestFormData] = useState({
    beneficiaryName: '',
    organization: '',
    phone: '',
    beneficiaryCount: '25',
    purpose: '',
  });
  const [requestSuccess, setRequestSuccess] = useState(false);

  const filterCategories = [
    { id: 'all', label: 'All Items' },
    { id: 'food_rations', label: 'Food & Grains' },
    { id: 'clothing_blankets', label: 'Clothes & Blankets' },
    { id: 'books_education', label: 'Books & Learning' },
    { id: 'mobility_medical', label: 'Mobility & Medical' },
    { id: 'hygiene_sanitation', label: 'Hygiene & Care' },
    { id: 'infant_care', label: 'Infant Supplies' },
  ];

  const filteredItems = resources.filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.locality.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || item.category === (selectedCategory as ResourceCategory);

    const matchesCity = selectedCity === 'all' || item.city === selectedCity;

    const matchesCondition =
      selectedCondition === 'all' || item.condition === selectedCondition;

    return matchesSearch && matchesCategory && matchesCity && matchesCondition;
  });

  const handleOpenInspector = (item: ResourceItem) => {
    setInspectingItem(item);
    setActivePhotoIndex(0);
  };

  const handleOpenRequest = (item: ResourceItem) => {
    setActiveRequestItem(item);
    setRequestSuccess(false);
  };

  const handleConfirmRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequestItem || !requestFormData.beneficiaryName || !requestFormData.phone) return;

    const newReq: HandoverRequest = {
      id: `req-handover-${Date.now().toString().slice(-4)}`,
      resourceId: activeRequestItem.id,
      resourceTitle: activeRequestItem.title,
      requesterName: requestFormData.beneficiaryName,
      organization: requestFormData.organization || undefined,
      phone: requestFormData.phone,
      beneficiaryCount: parseInt(requestFormData.beneficiaryCount) || 1,
      purpose: requestFormData.purpose || 'Community care distribution',
      requestedDate: new Date().toISOString().split('T')[0],
      status: 'Pending Coordinator Review',
      donorName: activeRequestItem.donorName,
      donorPhone: activeRequestItem.contactPhone,
      imageUrl: activeRequestItem.imageUrl,
    };

    if (onRequestResource) {
      onRequestResource(newReq);
    }

    setRequestSuccess(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">
            Verified Redistribution Catalog
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            Find Available Resources
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Browse verified supplies listed by local donors, community kitchens, and relief groups.
            Click any item for full Amazon-style multi-photo inspection and direct claim.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setCurrentPage('donate')}
          className="bg-teal-900 hover:bg-teal-800 shrink-0 shadow-sm"
        >
          <span>List a Donation</span>
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by keywords, grains, blankets, wheelchairs, locality..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          {/* City Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="all">All Locations (National)</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="New Delhi">New Delhi</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Hyderabad">Hyderabad</option>
              <option value="Chennai">Chennai</option>
              <option value="Pune">Pune</option>
            </select>
          </div>

          {/* Condition Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="all">All Conditions</option>
              <option value="New / Unopened">New / Unopened Only</option>
              <option value="Gently Used">Gently Used Only</option>
              <option value="Good Condition">Good Condition Only</option>
            </select>
          </div>
        </div>

        {/* Category Pill Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <Filter className="w-3.5 h-3.5 text-stone-400 shrink-0 mr-1" />
          {filterCategories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-teal-900 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Real DB Linking Banner */}
      <div className="flex items-center justify-between text-xs text-stone-500">
        <p>
          Showing <span className="font-semibold text-stone-900">{filteredItems.length}</span> verified{' '}
          {filteredItems.length === 1 ? 'item' : 'items'}
        </p>
        <span className="text-emerald-700 font-medium">Real-time persistent state synced across dashboards</span>
      </div>

      {/* Grid of Resource Cards */}
      {filteredItems.length === 0 ? (
        <Card className="text-center py-12 space-y-3">
          <p className="text-stone-500 text-sm">No resources match the selected criteria.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedCity('all');
              setSelectedCondition('all');
            }}
          >
            Clear all filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="flex flex-col justify-between hover:border-teal-700/60 transition-all space-y-4 group"
            >
              <div className="space-y-3">
                {item.imageUrl && (
                  <div
                    onClick={() => handleOpenInspector(item)}
                    className="h-48 -mx-6 -mt-6 rounded-t-xl overflow-hidden bg-stone-100 border-b border-stone-100 relative cursor-pointer"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-stone-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-full bg-white/90 text-stone-900 text-xs font-semibold shadow-md flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Photos & Specs</span>
                      </span>
                    </div>
                    {item.images && item.images.length > 1 && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-stone-900/80 text-white text-[10px] font-mono">
                        {item.images.length} Photos
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <MetadataRow
                    items={[
                      item.categoryLabel,
                      `${item.city}`,
                      item.condition,
                    ]}
                    className="mb-1.5"
                  />
                  <h3
                    onClick={() => handleOpenInspector(item)}
                    className="text-base font-bold text-stone-900 line-clamp-2 leading-snug cursor-pointer hover:text-teal-900 transition-colors"
                  >
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>

                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/60 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Quantity:</span>
                    <span className="font-semibold text-stone-900">{item.quantity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Pickup Area:</span>
                    <span className="text-stone-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {item.locality}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 font-medium">Donor:</span>
                    <span className="text-stone-700">{item.donorName}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span
                  className={`text-xs font-semibold flex items-center gap-1 ${
                    item.status === 'Available'
                      ? 'text-emerald-700'
                      : item.status === 'Reserved'
                      ? 'text-amber-700'
                      : 'text-stone-500'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{item.status}</span>
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenInspector(item)}
                    className="text-xs"
                  >
                    Details
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={item.status !== 'Available'}
                    onClick={() => handleOpenRequest(item)}
                    className={
                      item.status !== 'Available'
                        ? 'bg-stone-200 text-stone-500'
                        : 'bg-teal-900 hover:bg-teal-800'
                    }
                  >
                    {item.status === 'Available' ? 'Request Supply' : 'Claimed'}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Amazon-style Item Inspector & Photo Gallery Modal */}
      <Modal
        isOpen={!!inspectingItem}
        onClose={() => setInspectingItem(null)}
        title={inspectingItem?.title || 'Resource Details'}
        subtitle={inspectingItem ? `${inspectingItem.categoryLabel} · ${inspectingItem.city}` : ''}
        maxWidth="max-w-3xl"
      >
        {inspectingItem && (
          <div className="space-y-6">
            {/* Multi-Photo Amazon-style Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Photo Area */}
              <div className="md:col-span-7 space-y-3">
                <div className="h-72 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative group">
                  <img
                    src={
                      (inspectingItem.images && inspectingItem.images[activePhotoIndex]) ||
                      inspectingItem.imageUrl
                    }
                    alt={inspectingItem.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-stone-900/80 text-white text-xs font-medium">
                    {inspectingItem.condition}
                  </span>

                  {inspectingItem.images && inspectingItem.images.length > 1 && (
                    <>
                      {/* Prev Arrow */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIndex((prev) =>
                            prev > 0 ? prev - 1 : inspectingItem.images!.length - 1
                          )
                        }
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                        title="Previous Photo"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      {/* Next Arrow */}
                      <button
                        type="button"
                        onClick={() =>
                          setActivePhotoIndex((prev) =>
                            prev < inspectingItem.images!.length - 1 ? prev + 1 : 0
                          )
                        }
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-stone-900/70 hover:bg-stone-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-md"
                        title="Next Photo"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Photo counter */}
                      <span className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-full bg-stone-950/80 text-white text-[11px] font-mono shadow-xs">
                        {activePhotoIndex + 1} / {inspectingItem.images.length}
                      </span>
                    </>
                  )}
                </div>

                {/* Thumbnails row like Amazon */}
                {inspectingItem.images && inspectingItem.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {inspectingItem.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePhotoIndex(idx)}
                        className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                          activePhotoIndex === idx
                            ? 'border-emerald-600 ring-2 ring-emerald-400/30'
                            : 'border-stone-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info & Specifications */}
              <div className="md:col-span-5 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider bg-teal-50 px-2 py-0.5 rounded">
                    {inspectingItem.categoryLabel}
                  </span>
                  <h3 className="text-lg font-bold text-stone-900 leading-snug">
                    {inspectingItem.title}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Posted on {inspectingItem.postedDate} · Verified Community Listing
                  </p>
                </div>

                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Available Quantity:</span>
                    <span className="font-bold text-stone-900">{inspectingItem.quantity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Item Condition:</span>
                    <span className="font-semibold text-emerald-800">{inspectingItem.condition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Location:</span>
                    <span className="text-stone-800 font-medium">{inspectingItem.locality}, {inspectingItem.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Donor Entity:</span>
                    <span className="text-stone-800">{inspectingItem.donorName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Direct Pickup:</span>
                    <span className="text-emerald-700 font-medium">
                      {inspectingItem.pickupAvailable ? 'Yes (Coordinator onsite)' : 'Logistics support needed'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-600 leading-relaxed">
                  {inspectingItem.description}
                </p>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    disabled={inspectingItem.status !== 'Available'}
                    onClick={() => {
                      setInspectingItem(null);
                      handleOpenRequest(inspectingItem);
                    }}
                    className={
                      inspectingItem.status !== 'Available'
                        ? 'bg-stone-300'
                        : 'bg-teal-900 hover:bg-teal-800 shadow-md'
                    }
                  >
                    {inspectingItem.status === 'Available' ? 'Proceed to Claim Supply' : 'Already Claimed'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Request Item Modal */}
      <Modal
        isOpen={!!activeRequestItem}
        onClose={() => setActiveRequestItem(null)}
        title="Request Resource Handover"
        subtitle={activeRequestItem ? `${activeRequestItem.title} · ${activeRequestItem.city}` : ''}
      >
        {requestSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Request Dispatched & Recorded</h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              Your pickup and allocation request has been permanently saved to the handover queue and
              routed to donor coordinator <strong className="text-stone-900">{activeRequestItem?.donorName}</strong>.
            </p>
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs text-left max-w-sm mx-auto space-y-1.5">
              <p className="text-stone-700">
                <span className="text-stone-500">Item Status:</span> <strong className="text-amber-700">Reserved for Handover</strong>
              </p>
              <p className="flex items-center gap-2 text-stone-700">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>Coordinator: {activeRequestItem?.contactPhone}</span>
              </p>
              <p className="flex items-center gap-2 text-stone-700">
                <Mail className="w-3.5 h-3.5 text-stone-400" />
                <span>Email: {activeRequestItem?.contactEmail}</span>
              </p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActiveRequestItem(null);
                  setCurrentPage('user-dashboard');
                }}
                className="bg-teal-900"
              >
                View in My Dashboard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveRequestItem(null)}
              >
                Continue Browsing
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmRequest} className="space-y-4">
            <div className="p-3 bg-teal-50/70 border border-teal-200/70 rounded-lg text-xs text-teal-950 space-y-1">
              <p className="font-semibold">{activeRequestItem?.title}</p>
              <p className="text-teal-800">
                Quantity Available: {activeRequestItem?.quantity} · Location: {activeRequestItem?.locality},{' '}
                {activeRequestItem?.city}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Requester / Recipient Name *
              </label>
              <input
                type="text"
                required
                value={requestFormData.beneficiaryName}
                onChange={(e) =>
                  setRequestFormData({ ...requestFormData, beneficiaryName: e.target.value })
                }
                placeholder="e.g. Sister Meera / Suresh Sharma"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Shelter / Ashram (If applicable)
                </label>
                <input
                  type="text"
                  value={requestFormData.organization}
                  onChange={(e) =>
                    setRequestFormData({ ...requestFormData, organization: e.target.value })
                  }
                  placeholder="e.g. Shanti Ashram"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Contact Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={requestFormData.phone}
                  onChange={(e) =>
                    setRequestFormData({ ...requestFormData, phone: e.target.value })
                  }
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estimated Number of Beneficiaries Served
              </label>
              <input
                type="number"
                value={requestFormData.beneficiaryCount}
                onChange={(e) =>
                  setRequestFormData({ ...requestFormData, beneficiaryCount: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Intended Utilization & Need Note
              </label>
              <textarea
                rows={2}
                value={requestFormData.purpose}
                onChange={(e) =>
                  setRequestFormData({ ...requestFormData, purpose: e.target.value })
                }
                placeholder="Explain how this will be utilized..."
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setActiveRequestItem(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-teal-900 hover:bg-teal-800">
                Confirm & Submit Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
