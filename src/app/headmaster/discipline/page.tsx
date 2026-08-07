"use client";

import { useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';

interface DisciplinaryIncident {
  id: string;
  student: string;
  class: string;
  infraction: string;
  date: string;
  reporter: string;
  status: 'Under Review' | 'Parent Summoned' | 'Counseling Assigned' | 'Resolved';
  actionTaken?: string;
}

interface PrefectRecord {
  id: string;
  name: string;
  role: string;
  class: string;
  duties: string;
}

export default function HeadmasterDisciplinePage() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'prefects' | 'houses'>('incidents');

  const [incidents, setIncidents] = useState<DisciplinaryIncident[]>([]);
  const [prefects, setPrefects] = useState<PrefectRecord[]>([]);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isPrefectModalOpen, setIsPrefectModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<DisciplinaryIncident | null>(null);

  // Form states
  const [newIncident, setNewIncident] = useState({
    student: '',
    class: 'Primary 5',
    infraction: '',
    reporter: 'Form Master',
    status: 'Under Review' as DisciplinaryIncident['status'],
    actionTaken: ''
  });

  const [newPrefect, setNewPrefect] = useState({
    name: '',
    role: 'School Head Boy',
    class: 'JHS 3 Gold',
    duties: 'General school assembly coordination and pupil discipline.'
  });

  const housePoints = [
    { house: "Red House", points: 0, color: "bg-red-500 text-white" },
    { house: "Yellow House", points: 0, color: "bg-amber-400 text-amber-950" },
    { house: "Green House", points: 0, color: "bg-emerald-500 text-white" },
    { house: "Blue House", points: 0, color: "bg-blue-500 text-white" }
  ];

  const handleRecordInfraction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIncident.student.trim() || !newIncident.infraction.trim()) {
      toast.error("Please provide student name and infraction details.");
      return;
    }

    const created: DisciplinaryIncident = {
      id: `INF-${Date.now().toString().slice(-4)}`,
      student: newIncident.student.trim(),
      class: newIncident.class,
      infraction: newIncident.infraction.trim(),
      date: new Date().toISOString().split('T')[0],
      reporter: newIncident.reporter.trim(),
      status: newIncident.status,
      actionTaken: newIncident.actionTaken.trim() || 'Pending pastoral review'
    };

    setIncidents(prev => [created, ...prev]);
    toast.success(`Infraction logged for ${created.student}`);
    setIsRecordModalOpen(false);
    setNewIncident({
      student: '',
      class: 'Primary 5',
      infraction: '',
      reporter: 'Form Master',
      status: 'Under Review',
      actionTaken: ''
    });
  };

  const handleAppointPrefect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefect.name.trim() || !newPrefect.role.trim()) {
      toast.error("Please enter pupil name and prefect title.");
      return;
    }

    const record: PrefectRecord = {
      id: `PRF-${Date.now().toString().slice(-4)}`,
      name: newPrefect.name.trim(),
      role: newPrefect.role.trim(),
      class: newPrefect.class,
      duties: newPrefect.duties.trim()
    };

    setPrefects(prev => [...prev, record]);
    toast.success(`Appointed ${record.name} as ${record.role}`);
    setIsPrefectModalOpen(false);
    setNewPrefect({
      name: '',
      role: 'School Head Boy',
      class: 'JHS 3 Gold',
      duties: 'General school assembly coordination and pupil discipline.'
    });
  };

  const handleUpdateStatus = (incidentId: string, newStatus: DisciplinaryIncident['status']) => {
    setIncidents(prev => prev.map(inc => inc.id === incidentId ? { ...inc, status: newStatus } : inc));
    if (selectedIncident && selectedIncident.id === incidentId) {
      setSelectedIncident(prev => prev ? { ...prev, status: newStatus } : null);
    }
    toast.success(`Incident status updated to: ${newStatus}`);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Student Welfare & Pastoral Care
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Discipline, Conduct & Prefects Council
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Oversee behavioral infractions, merit house points, and prefect body governance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'prefects' ? (
            <button
              onClick={() => setIsPrefectModalOpen(true)}
              className="px-4 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ph-bold ph-user-plus"></i> Appoint Prefect
            </button>
          ) : (
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="px-4 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ph-bold ph-plus-circle"></i> Record Infraction
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'incidents' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          Conduct & Disciplinary Logs ({incidents.length})
        </button>
        <button
          onClick={() => setActiveTab('prefects')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'prefects' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          Prefect Body Governance ({prefects.length})
        </button>
        <button
          onClick={() => setActiveTab('houses')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'houses' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:bg-white'
          }`}
        >
          House Merit Points
        </button>
      </div>

      {/* 1. INCIDENTS VIEW */}
      {activeTab === 'incidents' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">Scholar & Class</th>
                  <th className="py-4 px-4">Infraction Details</th>
                  <th className="py-4 px-4">Reported By</th>
                  <th className="py-4 px-4">Disciplinary Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-xs text-brand-textMuted">
                      <i className="ph ph-shield-check text-3xl text-emerald-500 block mb-2"></i>
                      No disciplinary incidents or conduct infractions recorded this term.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <strong className="text-sm font-bold text-brand-textMain block">{inc.student}</strong>
                        <span className="font-mono text-[10px] text-gray-400">{inc.class} • {inc.id}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-brand-textMain font-semibold block">{inc.infraction}</span>
                        <span className="text-[10px] text-gray-400">{inc.date}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-700">{inc.reporter}</span>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          inc.status === 'Parent Summoned' ? 'bg-red-100 text-red-800' :
                          inc.status === 'Counseling Assigned' ? 'bg-amber-100 text-amber-800' :
                          inc.status === 'Resolved' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {inc.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedIncident(inc)}
                          className="px-3 py-1.5 bg-brand-bg hover:bg-brand-violet hover:text-white rounded-lg font-bold text-brand-textMain transition-all text-xs cursor-pointer"
                        >
                          Review Case
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. PREFECTS VIEW */}
      {activeTab === 'prefects' && (
        prefects.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center text-xs text-brand-textMuted">
            <i className="ph ph-crown text-3xl text-gray-300 block mb-2"></i>
            <p className="font-bold text-brand-textMain">No student prefect council appointments registered for this academic session yet.</p>
            <button
              onClick={() => setIsPrefectModalOpen(true)}
              className="mt-3 px-4 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark transition-colors inline-flex items-center gap-1.5 cursor-pointer"
            >
              <i className="ph-bold ph-plus"></i> Appoint First Prefect
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prefects.map((p, idx) => (
              <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-lg">
                    {p.role}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{p.id}</span>
                </div>
                <h3 className="font-serif font-bold text-base text-brand-textMain">{p.name}</h3>
                <p className="text-xs text-brand-textMuted">Class: <strong>{p.class}</strong></p>
                <div className="bg-brand-bg p-3.5 rounded-2xl text-xs text-gray-600">
                  <strong>Assigned Duties:</strong> {p.duties}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* 3. HOUSES VIEW */}
      {activeTab === 'houses' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          {housePoints.map((h, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm text-center space-y-3">
              <div className={`w-12 h-12 mx-auto rounded-2xl flex items-center justify-center font-bold text-lg ${h.color}`}>
                #{idx + 1}
              </div>
              <h3 className="font-serif font-bold text-base text-brand-textMain">{h.house}</h3>
              <strong className="text-2xl font-bold text-brand-violet block">{h.points} Pts</strong>
              <span className="text-[10px] text-gray-400 block font-semibold">Active Standings</span>
            </div>
          ))}
        </div>
      )}

      {/* RECORD INFRACTION MODAL */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Disciplinary Infraction"
        subtitle="Log pastoral care, behavioral issue, or school rule breach"
        size="lg"
      >
        <form onSubmit={handleRecordInfraction} className="space-y-4 text-xs pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-brand-textMain mb-1">Scholar Full Name *</label>
              <input
                type="text"
                required
                value={newIncident.student}
                onChange={(e) => setNewIncident({ ...newIncident, student: e.target.value })}
                placeholder="e.g. Kelvin Boateng"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block font-bold text-brand-textMain mb-1">Class / Form *</label>
              <input
                type="text"
                required
                value={newIncident.class}
                onChange={(e) => setNewIncident({ ...newIncident, class: e.target.value })}
                placeholder="e.g. Primary 5"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-brand-textMain mb-1">Infraction Details *</label>
            <textarea
              required
              rows={3}
              value={newIncident.infraction}
              onChange={(e) => setNewIncident({ ...newIncident, infraction: e.target.value })}
              placeholder="Describe the nature of the breach or behavioral observation..."
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-medium text-brand-textMain outline-none focus:border-brand-violet"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-brand-textMain mb-1">Reporting Officer / Teacher</label>
              <input
                type="text"
                value={newIncident.reporter}
                onChange={(e) => setNewIncident({ ...newIncident, reporter: e.target.value })}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block font-bold text-brand-textMain mb-1">Initial Status</label>
              <select
                value={newIncident.status}
                onChange={(e) => setNewIncident({ ...newIncident, status: e.target.value as any })}
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              >
                <option value="Under Review">Under Review</option>
                <option value="Counseling Assigned">Counseling Assigned</option>
                <option value="Parent Summoned">Parent Summoned</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <i className="ph-bold ph-shield-warning"></i> Commit Infraction to Ledger
          </button>
        </form>
      </Modal>

      {/* APPOINT PREFECT MODAL */}
      <Modal
        isOpen={isPrefectModalOpen}
        onClose={() => setIsPrefectModalOpen(false)}
        title="Appoint Student Prefect"
        subtitle="Formally gazette a student leader into the Prefects Council"
        size="lg"
      >
        <form onSubmit={handleAppointPrefect} className="space-y-4 text-xs pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-brand-textMain mb-1">Pupil Name *</label>
              <input
                type="text"
                required
                value={newPrefect.name}
                onChange={(e) => setNewPrefect({ ...newPrefect, name: e.target.value })}
                placeholder="e.g. Emmanuel Boateng"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>

            <div>
              <label className="block font-bold text-brand-textMain mb-1">Prefect Portfolio *</label>
              <input
                type="text"
                required
                value={newPrefect.role}
                onChange={(e) => setNewPrefect({ ...newPrefect, role: e.target.value })}
                placeholder="e.g. School Head Prefect, Chapel Prefect"
                className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-semibold text-brand-textMain outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-brand-textMain mb-1">Assigned Duties & Mandate</label>
            <textarea
              rows={3}
              value={newPrefect.duties}
              onChange={(e) => setNewPrefect({ ...newPrefect, duties: e.target.value })}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3.5 py-2.5 font-medium text-brand-textMain outline-none focus:border-brand-violet"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <i className="ph-bold ph-crown"></i> Seal Prefect Appointment
          </button>
        </form>
      </Modal>

      {/* REVIEW CASE MODAL */}
      <Modal
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
        title={selectedIncident ? `Disciplinary Case: ${selectedIncident.id}` : ''}
        subtitle="Pastoral Review & Case Outcome"
        size="lg"
      >
        {selectedIncident && (
          <div className="space-y-6 pt-2 text-xs">
            <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-brand-textMain text-sm">{selectedIncident.student}</span>
                <span className="font-mono text-gray-500">{selectedIncident.class}</span>
              </div>
              <p className="text-gray-700 font-medium"><strong>Infraction:</strong> {selectedIncident.infraction}</p>
              <div className="flex justify-between text-[11px] text-gray-500 pt-2 border-t border-gray-200">
                <span>Reported by: <strong>{selectedIncident.reporter}</strong></span>
                <span>Date: {selectedIncident.date}</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-brand-textMain mb-2">Update Disciplinary Status</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['Under Review', 'Counseling Assigned', 'Parent Summoned', 'Resolved'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleUpdateStatus(selectedIncident.id, st)}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                      selectedIncident.status === st
                        ? 'bg-brand-violet text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="px-5 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Review
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
