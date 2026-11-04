/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { PageId, ResourceCategory, ItemCondition, ResourceItem } from '../types';
import { Button, Card, NoticeBanner } from '../components/common/UIComponents';
import {
  PackagePlus,
  Utensils,
  Shirt,
  BookOpen,
  HeartPulse,
  Sparkles,
  Baby,
  CheckCircle2,
  ArrowRight,
  Upload,
  Camera,
  Trash2,
  Star,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';

interface DonatePageProps {
  setCurrentPage: (page: PageId) => void;
  onAddResource: (item: ResourceItem) => Promise<void>;
}

export function DonatePage({ setCurrentPage, onAddResource }: DonatePageProps) {
  const [category, setCategory] = useState<ResourceCategory>('food_rations');
  const [formData, setFormData] = useState({
    title: '',
    quantity: '',
    condition: 'New / Unopened' as ItemCondition,
    city: 'Bengaluru',
    locality: '',
    donorName: '',
    donorPhone: '',
    donorEmail: '',
    description: '',
    pickupAvailable: true,
  });

  // Amazon-style multi-photo gallery state
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([
    '/src/assets/images/resource_redistribution_boxes_1793546426574.jpg',
  ]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number>(0);
  const [customUrl, setCustomUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [submittedItem, setSubmittedItem] = useState<ResourceItem | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categories = [
    { id: 'food_rations', label: 'Food & Grains', icon: Utensils, desc: 'Flour, rice, pulses, canned goods' },
    { id: 'clothing_blankets', label: 'Clothes & Blankets', icon: Shirt, desc: 'Winter wear, blankets, uniforms' },
    { id: 'books_education', label: 'Books & Education', icon: BookOpen, desc: 'Textbooks, stationery, learning kits' },
    { id: 'mobility_medical', label: 'Mobility & Medical', icon: HeartPulse, desc: 'Wheelchairs, canes, sanitizers' },
    { id: 'hygiene_sanitation', label: 'Hygiene & Sanitation', icon: Sparkles, desc: 'Soaps, sanitary pads, kits' },
    { id: 'infant_care', label: 'Infant Care', icon: Baby, desc: 'Formula, baby clothes, diapers' },
  ];

  const photoPresets = [
    {
      label: 'Warehouse & Sealed Boxes',
      url: '/src/assets/images/resource_redistribution_boxes_1793546426574.jpg',
    },
    {
      label: 'Shelter Kits & Blankets',
      url: '/src/assets/images/ngo_distribution_care_1793546425595.jpg',
    },
    {
      label: 'Community Care & Supplies',
      url: '/src/assets/images/hero_community_giving_1793546425262.jpg',
    },
    {
      label: 'Clinical Medical Supplies',
      url: '/src/assets/images/blood_donation_care_1793546425225.jpg',
    },
  ];

  const processFileList = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setUploadedPhotos((prev) => [...prev, event.target!.result as string].slice(0, 6));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFileList(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleAddCustomUrl = () => {
    if (!customUrl.trim()) return;
    if (!uploadedPhotos.includes(customUrl.trim())) {
      setUploadedPhotos((prev) => [...prev, customUrl.trim()].slice(0, 6));
    }
    setCustomUrl('');
  };

  const handleAddPresetPhoto = (url: string) => {
    if (uploadedPhotos.includes(url)) return;
    setUploadedPhotos((prev) => [...prev, url].slice(0, 6));
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (primaryPhotoIndex >= updated.length) {
        setPrimaryPhotoIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleSetPrimary = (index: number) => {
    setPrimaryPhotoIndex(index);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.title.trim()) errs.title = 'Resource title is required.';
    if (!formData.quantity.trim()) errs.quantity = 'Quantity and packaging must be specified.';
    if (!formData.locality.trim()) errs.locality = 'Neighborhood or locality is required.';
    if (!formData.donorName.trim()) errs.donorName = 'Your name or organization is required.';
    if (!formData.donorPhone.trim() || formData.donorPhone.length < 8) {
      errs.donorPhone = 'Valid contact phone number is required.';
    }
    if (uploadedPhotos.length === 0) {
      errs.photos = 'Please add at least one photo of the items being donated.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const categoryItem = categories.find((c) => c.id === category);
    const primaryImg = uploadedPhotos[primaryPhotoIndex] || uploadedPhotos[0] || photoPresets[0].url;

    const newItem: ResourceItem = {
      id: `res-${Date.now()}`,
      title: formData.title,
      category,
      categoryLabel: categoryItem?.label || 'General Resource',
      quantity: formData.quantity,
      condition: formData.condition,
      city: formData.city,
      locality: formData.locality,
      donorName: formData.donorName,
      donorType: 'Individual Donor',
      status: 'Available',
      postedDate: new Date().toISOString().split('T')[0],
      description: formData.description || 'Donated in good faith via GiveConnect community network.',
      pickupAvailable: formData.pickupAvailable,
      contactEmail: formData.donorEmail || 'donor@giveconnect.demo',
      contactPhone: formData.donorPhone,
      imageUrl: primaryImg,
      images: uploadedPhotos.length > 0 ? uploadedPhotos : [primaryImg],
    };

    try {
      await onAddResource(newItem);
      setSubmittedItem(newItem);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to publish your donation. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">
          Direct Contribution
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
          Donate Surplus Resources
        </h1>
        <p className="text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
          List surplus rations, clothes, textbooks, or medical aids with photos like on modern marketplaces.
          Verified NGOs and local coordinators will inspect and coordinate pickup.
        </p>
      </div>

      <NoticeBanner
        type="info"
        title="Dignity & Quality Protocol"
        message="Please donate items that are clean, hygienic, and safe for immediate distribution. Upload clear photos of packages, expiry dates, or condition tags."
      />

      {submittedItem ? (
        <Card className="text-center py-10 px-6 space-y-5">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-stone-900 font-serif">Donation Listing Created</h2>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            "<strong className="text-stone-900">{submittedItem.title}</strong>" is now live in the
            GiveConnect redistribution registry for <strong className="text-stone-900">{submittedItem.city}</strong>.
          </p>

          {/* Published Item Preview Card with Photos */}
          <div className="max-w-md mx-auto p-4 bg-white rounded-xl border border-stone-200 text-left shadow-xs space-y-3">
            {submittedItem.imageUrl && (
              <div className="relative h-48 rounded-lg overflow-hidden bg-stone-100">
                <img
                  src={submittedItem.imageUrl}
                  alt={submittedItem.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-teal-900/90 text-white text-[11px] font-semibold">
                  {submittedItem.categoryLabel}
                </span>
                {submittedItem.images && submittedItem.images.length > 1 && (
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-stone-900/80 text-white text-[10px] font-mono">
                    {submittedItem.images.length} Photos
                  </span>
                )}
              </div>
            )}
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-stone-500">Quantity:</span>
                <span className="font-semibold text-stone-900">{submittedItem.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Condition:</span>
                <span className="text-stone-800 font-medium">{submittedItem.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Location:</span>
                <span className="text-stone-800">{submittedItem.locality}, {submittedItem.city}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Status:</span>
                <span className="text-emerald-700 font-bold">Active in Catalog</span>
              </div>
            </div>
          </div>

          <div className="pt-3 flex flex-wrap justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => setCurrentPage('resources')}
              className="bg-teal-900 hover:bg-teal-800"
            >
              <span>View in Resource Directory</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setCurrentPage('user-dashboard')}
            >
              Check My Dashboard
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                setSubmittedItem(null);
                setFormData({
                  title: '',
                  quantity: '',
                  condition: 'New / Unopened',
                  city: 'Bengaluru',
                  locality: '',
                  donorName: '',
                  donorPhone: '',
                  donorEmail: '',
                  description: '',
                  pickupAvailable: true,
                });
                setUploadedPhotos([photoPresets[0].url]);
              }}
            >
              Donate Another Resource
            </Button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {submitError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {submitError}
            </div>
          )}
          {/* 1. Category Selection */}
          <div>
            <label className="block text-sm font-bold text-stone-900 mb-3">
              1. Select Resource Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as ResourceCategory)}
                    className={`p-3.5 text-left rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-900 bg-teal-50/70 shadow-xs ring-1 ring-teal-900/20'
                        : 'border-stone-200 bg-white hover:border-stone-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-teal-900' : 'text-stone-500'}`} />
                    <div className="text-xs font-bold text-stone-900">{cat.label}</div>
                    <div className="text-[11px] text-stone-500 mt-0.5 leading-tight">{cat.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Real Amazon-style Photo Upload Section */}
          <Card className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal-800" />
                  <span>2. Resource Photos ({uploadedPhotos.length} / 6)</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Clear photos help ashrams and coordinators quickly verify and claim your donation.
                </p>
              </div>

              {/* Upload button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="donation-photo-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="border-teal-800 text-teal-900 hover:bg-teal-50 gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photos from Device</span>
                </Button>
              </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 rounded-xl border-2 border-dashed transition-all ${
                isDragging
                  ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-400/40'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
              }`}
            >
              {uploadedPhotos.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>
                      {uploadedPhotos.length} / 6 photos added · Click &ldquo;Set as Cover&rdquo; to choose the main listing thumbnail
                    </span>
                    <span className="text-emerald-700 font-medium hidden sm:inline">
                      Drag files anywhere in this box
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {uploadedPhotos.map((photoUrl, idx) => {
                      const isPrimary = idx === primaryPhotoIndex;
                      return (
                        <div
                          key={idx}
                          className={`group relative rounded-xl overflow-hidden border-2 bg-stone-100 transition-all ${
                            isPrimary
                              ? 'border-emerald-600 shadow-md ring-2 ring-emerald-400/30'
                              : 'border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <img
                            src={photoUrl}
                            alt={`Donation photo ${idx + 1}`}
                            className="w-full h-28 object-cover"
                          />

                          {/* Primary Badge */}
                          {isPrimary && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-700 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                              <Star className="w-3 h-3 fill-white" />
                              <span>Main Cover</span>
                            </span>
                          )}

                          {/* Action Overlay */}
                          <div className="absolute inset-0 bg-stone-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx)}
                                className="p-1 rounded-full bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-xs cursor-pointer"
                                title="Delete Photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {!isPrimary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimary(idx)}
                                className="w-full py-1 text-[11px] font-medium rounded bg-white text-stone-900 hover:bg-stone-100 transition-colors shadow-xs cursor-pointer"
                              >
                                Set as Cover
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {uploadedPhotos.length < 6 && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-28 rounded-xl border-2 border-dashed border-stone-300 hover:border-teal-700 hover:bg-teal-50/30 flex flex-col items-center justify-center gap-1 text-stone-500 hover:text-teal-900 transition-colors cursor-pointer"
                      >
                        <Plus className="w-5 h-5 text-stone-400" />
                        <span className="text-xs font-medium">Add Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-8 text-center cursor-pointer transition-colors space-y-2"
                >
                  <div className="w-10 h-10 rounded-full bg-stone-200 text-stone-600 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-stone-800">
                    Drop your donation photos here or click to browse
                  </p>
                  <p className="text-[11px] text-stone-500">Supports multi-file upload JPG, PNG, WEBP (Up to 6 photos)</p>
                </div>
              )}
            </div>

            {errors.photos && <p className="text-xs text-rose-600 mt-1">{errors.photos}</p>}

            {/* Direct Image URL input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Or paste an image web URL..."
                className="flex-1 px-3 py-1.5 text-xs border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCustomUrl}
                disabled={!customUrl.trim() || uploadedPhotos.length >= 6}
                className="text-xs py-1.5"
              >
                Add URL
              </Button>
            </div>

            {/* Quick Presets for Demo Testing */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                Quick Category Presets (For instant testing):
              </span>
              <div className="flex flex-wrap gap-2">
                {photoPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddPresetPhoto(preset.url)}
                    className="text-xs px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amazon-style Live Listing Preview Box */}
            {uploadedPhotos.length > 0 && (
              <div className="pt-3 border-t border-stone-100">
                <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider block mb-2">
                  Amazon-Style Catalog Preview (Live Appearance):
                </span>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-col sm:flex-row gap-3.5 items-center">
                  <div className="relative w-36 h-28 rounded-lg overflow-hidden border border-stone-200 shrink-0 bg-stone-200">
                    <img
                      src={uploadedPhotos[primaryPhotoIndex] || uploadedPhotos[0]}
                      alt="Cover Preview"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 bg-stone-900/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      {uploadedPhotos.length} {uploadedPhotos.length === 1 ? 'photo' : 'photos'}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs flex-1">
                    <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-900 font-semibold text-[10px] uppercase">
                      {categories.find((c) => c.id === category)?.label || 'General'}
                    </span>
                    <h5 className="font-bold text-stone-900 line-clamp-1">
                      {formData.title || 'Untitled Donation Resource'}
                    </h5>
                    <p className="text-stone-500 text-[11px]">
                      Quantity: <strong className="text-stone-800">{formData.quantity || 'Not specified yet'}</strong> · {formData.condition}
                    </p>
                    <p className="text-stone-500 text-[11px]">
                      Location: {formData.locality || 'Locality'}, {formData.city}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 3. Item Details */}
          <Card className="space-y-4">
            <h3 className="text-base font-bold text-stone-900">3. Resource Details</h3>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Item Title / Summary *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. 100 kg Unopened Basmati Rice & Lentils"
                className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
              {errors.title && <p className="text-xs text-rose-600 mt-1">{errors.title}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Quantity & Packaging *
                </label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g. 4 cartons (approx. 50 kg total)"
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
                {errors.quantity && <p className="text-xs text-rose-600 mt-1">{errors.quantity}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Condition *
                </label>
                <select
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value as ItemCondition })
                  }
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
                >
                  <option value="New / Unopened">New / Unopened (Factory sealed)</option>
                  <option value="Gently Used">Gently Used (Clean, fully operational)</option>
                  <option value="Good Condition">Good Condition (Serviced/sanitized)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Description & Handling Notes
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mention storage conditions, package markings, or specific beneficiaries it would best serve..."
                className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>
          </Card>

          {/* 4. Location & Contact */}
          <Card className="space-y-4">
            <h3 className="text-base font-bold text-stone-900">4. Pickup & Contact Coordination</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  City *
                </label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
                >
                  <option value="Bengaluru">Bengaluru</option>
                  <option value="New Delhi">New Delhi</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Hyderabad">Hyderabad</option>
                  <option value="Chennai">Chennai</option>
                  <option value="Pune">Pune</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Locality / Landmark *
                </label>
                <input
                  type="text"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  placeholder="e.g. Indiranagar 100ft Road"
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
                {errors.locality && <p className="text-xs text-rose-600 mt-1">{errors.locality}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Donor / Organization Name *
                </label>
                <input
                  type="text"
                  value={formData.donorName}
                  onChange={(e) => setFormData({ ...formData, donorName: e.target.value })}
                  placeholder="e.g. Swetha Foundation"
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
                {errors.donorName && <p className="text-xs text-rose-600 mt-1">{errors.donorName}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={formData.donorPhone}
                  onChange={(e) => setFormData({ ...formData, donorPhone: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
                {errors.donorPhone && (
                  <p className="text-xs text-rose-600 mt-1">{errors.donorPhone}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.donorEmail}
                  onChange={(e) => setFormData({ ...formData, donorEmail: e.target.value })}
                  placeholder="swetha@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pickupAvailable}
                  onChange={(e) =>
                    setFormData({ ...formData, pickupAvailable: e.target.checked })
                  }
                  className="rounded text-teal-900 focus:ring-teal-700 w-4 h-4"
                />
                <span className="text-xs text-stone-700">
                  Volunteers or recipients can pick up from this address directly (coordination via phone).
                </span>
              </label>
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setCurrentPage('resources')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="bg-teal-900 hover:bg-teal-800 shadow-md"
              disabled={isSubmitting}
            >
              <PackagePlus className="w-5 h-5 mr-1.5" />
              <span>{isSubmitting ? 'Publishing…' : 'Publish Resource Listing'}</span>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
