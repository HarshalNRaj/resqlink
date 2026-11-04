/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { PageId, VolunteerTask } from '../types';
import { SAMPLE_VOLUNTEER_TASKS } from '../data/sampleData';
import { Button, Card, Modal, NoticeBanner, MetadataRow } from '../components/common/UIComponents';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Phone,
  Search,
  Sparkles,
  Heart,
  Truck,
} from 'lucide-react';

interface VolunteersPageProps {
  setCurrentPage: (page: PageId) => void;
  tasks?: VolunteerTask[];
  onSignup?: (taskId: string, volunteerName: string, volunteerPhone: string) => void;
  onTrackSupplyRun?: () => void;
}

export function VolunteersPage({
  setCurrentPage,
  tasks: propTasks,
  onSignup: propOnSignup,
  onTrackSupplyRun,
}: VolunteersPageProps) {
  const [localTasks, setLocalTasks] = useState<VolunteerTask[]>(SAMPLE_VOLUNTEER_TASKS);
  const tasks = propTasks || localTasks;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Task Signup Modal
  const [selectedTask, setSelectedTask] = useState<VolunteerTask | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [volunteerName, setVolunteerName] = useState('');
  const [volunteerPhone, setVolunteerPhone] = useState('');

  // General Volunteer Registration Modal
  const [generalRegisterOpen, setGeneralRegisterOpen] = useState(false);
  const [generalSuccess, setGeneralSuccess] = useState(false);
  const [generalForm, setGeneralForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: 'Bengaluru',
    availability: 'Weekends Only',
    hasVehicle: true,
    skills: 'Sorting, Community outreach, Driving',
  });

  const categories = [
    'all',
    'Sorting & Packaging',
    'Field Distribution',
    'Blood Donation Drive',
    'Elderly Support',
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      searchTerm === '' ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;

    return matchesSearch && matchesCat;
  });

  const handleTaskSignup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteerName || !volunteerPhone || !selectedTask) return;

    if (propOnSignup) {
      propOnSignup(selectedTask.id, volunteerName, volunteerPhone);
    } else {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? { ...t, volunteersRegistered: Math.min(t.volunteersNeeded, t.volunteersRegistered + 1) }
            : t
        )
      );
    }
    setSignupSuccess(true);
  };

  const handleGeneralRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generalForm.name || !generalForm.phone) return;
    setGeneralSuccess(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800 mb-1">
            Community Action Force
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-teal-950 font-serif">
            Volunteer Hub & Task Management
          </h1>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            Lend your hands and heart. Join scheduled supply sorting drives, blood donation camps, and elder sanctuary visits.
          </p>
        </div>

        <Button
          variant="accent"
          size="md"
          onClick={() => {
            setGeneralRegisterOpen(true);
            setGeneralSuccess(false);
          }}
          className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
        >
          <Sparkles className="w-4 h-4 mr-1.5" />
          <span>Join Volunteer Network</span>
        </Button>
      </div>

      <NoticeBanner
        type="info"
        title="Field Safety & Dignity Guidelines"
        message="All volunteers receive a brief orientation on respectful aid distribution, hygiene protocols, and beneficiary dignity before shifts begin."
      />

      {/* Swiggy-Style Live Supply Tracker Feature Card */}
      <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 border border-emerald-800/40 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-32 bg-emerald-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Swiggy-Style Live Fleet Engine</span>
              </span>
              <span className="text-xs text-stone-300 font-medium">3 Missions Active</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold font-serif text-white">
              Live Volunteer Supply Route Tracker
            </h3>

            <p className="text-xs text-emerald-100/80 leading-relaxed">
              Track relief volunteer dispatches across Mysuru in real-time. When logged in as a volunteer, broadcast your live device GPS telemetry or monitor dispatches from Bandipalya APMC to Kuvempunagar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                if (onTrackSupplyRun) {
                  onTrackSupplyRun();
                } else {
                  setCurrentPage('supply-tracker');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-900/40 transition-all cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>Launch Live Supply Tracker</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-xl border border-stone-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks by skill, organization, or activity..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
            >
              <option value="all">All Task Categories</option>
              <option value="Sorting & Packaging">Sorting & Packaging</option>
              <option value="Field Distribution">Field Distribution</option>
              <option value="Blood Donation Drive">Blood Donation Drive</option>
              <option value="Elderly Support">Elderly Support</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.map((task) => {
          const spotsLeft = task.volunteersNeeded - task.volunteersRegistered;
          const isFull = spotsLeft <= 0;

          return (
            <Card
              key={task.id}
              className="flex flex-col justify-between hover:border-teal-700/60 transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span className="font-semibold text-teal-900 bg-teal-50 px-2.5 py-0.5 rounded border border-teal-200/60">
                    {task.category}
                  </span>
                  <span className="font-medium text-stone-600">{task.organization}</span>
                </div>

                <h3 className="text-base font-bold text-stone-900 leading-snug">{task.title}</h3>

                <p className="text-xs text-stone-600 line-clamp-3 leading-relaxed">
                  {task.description}
                </p>

                {/* Timing & Place */}
                <div className="p-3 bg-stone-50 rounded-lg border border-stone-200/60 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-stone-700">
                    <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{task.date}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>{task.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    <span>
                      {task.locality}, {task.city}
                    </span>
                  </div>
                </div>

                {/* Slots filled progress */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-stone-500">Volunteers Signed Up:</span>
                    <span className="font-semibold text-stone-900 tabular-nums">
                      {task.volunteersRegistered} / {task.volunteersNeeded}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all"
                      style={{
                        width: `${(task.volunteersRegistered / task.volunteersNeeded) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-400">
                    {isFull ? 'Task reached full capacity' : `${spotsLeft} spots remaining`}
                  </p>
                </div>

                {/* Skills needed */}
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {task.skillsRequired.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-stone-100 text-stone-600"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div className="text-xs text-stone-500">
                  <p className="font-medium text-stone-800">{task.coordinatorName}</p>
                  <p className="font-mono text-[11px] text-stone-400">{task.coordinatorPhone}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {task.category === 'Field Distribution' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (onTrackSupplyRun) onTrackSupplyRun();
                        else setCurrentPage('supply-tracker');
                      }}
                      className="text-emerald-800 border-emerald-300 hover:bg-emerald-50 text-xs flex items-center gap-1"
                      title="Open Live Supply Run Tracking Console"
                    >
                      <Truck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="hidden sm:inline">Track Run</span>
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isFull}
                    onClick={() => {
                      setSelectedTask(task);
                      setSignupSuccess(false);
                      setVolunteerName('');
                      setVolunteerPhone('');
                    }}
                    className={isFull ? 'bg-stone-300' : 'bg-teal-900 hover:bg-teal-800'}
                  >
                    {isFull ? 'Completed' : 'Sign Up for Shift'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Task Signup Modal */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Confirm Volunteer Shift Registration"
        subtitle={selectedTask ? `${selectedTask.title} · ${selectedTask.date}` : ''}
      >
        {signupSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Shift Confirmed</h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              Thank you, <strong className="text-stone-900">{volunteerName}</strong>! Your registration
              for "{selectedTask?.title}" on {selectedTask?.date} is confirmed. Coordinator{' '}
              {selectedTask?.coordinatorName} will message you via WhatsApp with gate pass details.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setSelectedTask(null)}
                className="bg-teal-900"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleTaskSignup} className="space-y-4">
            <div className="p-3 bg-stone-50 border border-stone-200 rounded-lg text-xs space-y-1">
              <p className="font-semibold text-stone-900">{selectedTask?.title}</p>
              <p className="text-stone-600">
                Time: {selectedTask?.duration} · Location: {selectedTask?.locality},{' '}
                {selectedTask?.city}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                value={volunteerName}
                onChange={(e) => setVolunteerName(e.target.value)}
                placeholder="e.g. Deepa Nair"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                WhatsApp / Phone Number *
              </label>
              <input
                type="tel"
                required
                value={volunteerPhone}
                onChange={(e) => setVolunteerPhone(e.target.value)}
                placeholder="+91 98450 12345"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedTask(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-teal-900">
                Confirm Registration
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* General Volunteer Registration Modal */}
      <Modal
        isOpen={generalRegisterOpen}
        onClose={() => setGeneralRegisterOpen(false)}
        title="Enroll in GiveConnect Volunteer Corps"
        subtitle="Be notified when local NGOs or blood donation drives need assistance"
      >
        {generalSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-stone-900">Volunteer Enrolled</h4>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              Welcome, <strong className="text-stone-900">{generalForm.name}</strong>! You are now part
              of the {generalForm.city} volunteer directory.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setGeneralRegisterOpen(false)}
                className="bg-teal-900"
              >
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleGeneralRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={generalForm.name}
                onChange={(e) => setGeneralForm({ ...generalForm, name: e.target.value })}
                placeholder="e.g. Rahul Sen"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={generalForm.phone}
                  onChange={(e) => setGeneralForm({ ...generalForm, phone: e.target.value })}
                  placeholder="+91 98450 00000"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">City *</label>
                <input
                  type="text"
                  value={generalForm.city}
                  onChange={(e) => setGeneralForm({ ...generalForm, city: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Typical Availability
                </label>
                <select
                  value={generalForm.availability}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, availability: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 bg-white"
                >
                  <option value="Weekends Only">Weekends Only</option>
                  <option value="Weekday Mornings">Weekday Mornings</option>
                  <option value="Flexible / On-call">Flexible / On-call</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Skills & Interests
                </label>
                <input
                  type="text"
                  value={generalForm.skills}
                  onChange={(e) => setGeneralForm({ ...generalForm, skills: e.target.value })}
                  placeholder="e.g. Packing, Driving, First-Aid"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
                />
              </div>
            </div>

            <div className="pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={generalForm.hasVehicle}
                  onChange={(e) =>
                    setGeneralForm({ ...generalForm, hasVehicle: e.target.checked })
                  }
                  className="rounded text-teal-900 focus:ring-teal-700 w-4 h-4"
                />
                <span className="text-xs text-stone-600">
                  I have a 2-wheeler or 4-wheeler vehicle available for local supply transport.
                </span>
              </label>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGeneralRegisterOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-amber-600 text-white">
                Register as Volunteer
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
