"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';

interface LessonScheme {
  id: string;
  scheme_code: string;
  teacher_id?: string;
  teacher_name: string;
  class_grade: string;
  subject: string;
  week: string;
  strand: string;
  sub_strand: string;
  tlr?: string;
  objectives?: string;
  starter?: string;
  main_activity?: string;
  plenary?: string;
  differentiation?: string;
  status: 'Pending' | 'Approved' | 'Revision Requested';
  headmaster_notes?: string;
  vetted_by?: string;
  vetted_at?: string;
  created_at?: string;
  updated_at?: string;
}

export default function HeadmasterInspectionsPage() {
  const [filter, setFilter] = useState<'All' | 'Pending' | 'Approved'>('Pending');
  const [selectedPlan, setSelectedPlan] = useState<LessonScheme | null>(null);
  const [lessonPlans, setLessonPlans] = useState<LessonScheme[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Revision Feedback Modal State
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [revisionTargetPlan, setRevisionTargetPlan] = useState<LessonScheme | null>(null);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  const loadSchemes = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await RoselandApi.academic.getLessonSchemes();
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setLessonPlans(list);
    } catch (e) {
      console.error("Failed to load lesson schemes", e);
      toast.error("Failed to load lesson schemes for inspection");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchemes();
  }, [loadSchemes]);

  const handleApprove = async (plan: LessonScheme) => {
    const headmasterName = currentUser?.fullName || (currentUser as any)?.name || "Mr. Kwame Asamoah (Headmaster)";
    setActionLoading(true);

    try {
      await RoselandApi.academic.vetLessonScheme(plan.id, {
        status: 'Approved',
        headmaster_notes: 'Standard GES NaCCA digital seal affixed. Approved for classroom instruction.',
        vetted_by: headmasterName
      });

      // Broadcast notification back to the teacher
      try {
        await RoselandApi.notify.broadcastNotice({
          targetGroup: "TEACHERS",
          title: `Scheme Approved: ${plan.subject} (${plan.class_grade})`,
          message: `Your ${plan.week} scheme for ${plan.subject} has been approved and sealed by ${headmasterName}.`
        });
      } catch {}

      toast.success(`Lesson plan ${plan.scheme_code || ''} approved and official digital seal affixed!`);
      await loadSchemes();
      if (selectedPlan?.id === plan.id) {
        setSelectedPlan(null);
      }
    } catch (err: any) {
      console.error("Failed to approve scheme", err);
      toast.error(err?.message || "Failed to approve lesson scheme.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRevisionModal = (plan: LessonScheme) => {
    setRevisionTargetPlan(plan);
    setRevisionFeedback(
      plan.headmaster_notes || "Kindly refine the specific learner objectives and incorporate concrete teaching manipulatives for the main activity."
    );
    setRevisionModalOpen(true);
  };

  const handleSubmitRevision = async () => {
    if (!revisionTargetPlan) return;
    if (!revisionFeedback.trim()) {
      toast.error("Please provide supervisory feedback notes for the teacher.");
      return;
    }

    const headmasterName = currentUser?.fullName || (currentUser as any)?.name || "Mr. Kwame Asamoah (Headmaster)";
    setActionLoading(true);

    try {
      await RoselandApi.academic.vetLessonScheme(revisionTargetPlan.id, {
        status: 'Revision Requested',
        headmaster_notes: revisionFeedback.trim(),
        vetted_by: headmasterName
      });

      // Broadcast notification back to the teacher
      try {
        await RoselandApi.notify.broadcastNotice({
          targetGroup: "TEACHERS",
          title: `Revision Requested: ${revisionTargetPlan.subject} (${revisionTargetPlan.class_grade})`,
          message: `Headmaster requested pedagogical revisions for your ${revisionTargetPlan.week} ${revisionTargetPlan.subject} scheme.`
        });
      } catch {}

      toast.success("Feedback dispatched to educator for lesson refinement.");
      setRevisionModalOpen(false);
      setRevisionTargetPlan(null);
      await loadSchemes();
      if (selectedPlan?.id === revisionTargetPlan.id) {
        setSelectedPlan(null);
      }
    } catch (err: any) {
      console.error("Failed to request revision", err);
      toast.error(err?.message || "Failed to submit revision feedback.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredPlans = lessonPlans.filter(p => {
    if (filter === 'All') return true;
    return p.status === filter;
  });

  const pendingCount = lessonPlans.filter(p => p.status === 'Pending').length;
  const approvedCount = lessonPlans.filter(p => p.status === 'Approved').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Curriculum Supervision & NaCCA Standards
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Lesson Plan Vetting & Walkthroughs
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Review weekly schemes of work submitted by teaching faculty, enforce GES NaCCA standards, and evaluate instructional resources.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-brand-bg p-1.5 rounded-2xl border border-gray-200/60 shrink-0">
          {(['Pending', 'Approved', 'All'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === f
                  ? 'bg-brand-violet text-white shadow-sm'
                  : 'text-brand-textMuted hover:text-brand-textMain'
              }`}
            >
              {f === 'Pending' ? `Pending Review (${pendingCount})` : f === 'Approved' ? `Approved (${approvedCount})` : `All (${lessonPlans.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Lesson Plans */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center">
          <p className="text-xs text-brand-textMuted">Loading submitted lesson schemes...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-gray-100 shadow-sm text-center">
          <i className="ph ph-notebook text-4xl text-gray-300 block mb-2"></i>
          <h3 className="font-serif font-bold text-base text-brand-textMain">
            {filter === 'Pending' ? "No Lesson Schemes Pending Vetting" : "No Schemes Found in this Category"}
          </h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto mt-1">
            When teaching faculty generate and submit weekly lesson schemes from the Teacher Portal, they will appear here for NaCCA curriculum inspection and sign-off.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredPlans.map((plan) => (
            <div key={plan.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-lg">
                    {plan.scheme_code || plan.id.slice(0, 8)} • {plan.week}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    plan.status === 'Approved'
                      ? 'bg-green-100 text-green-800'
                      : plan.status === 'Revision Requested'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {plan.status}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-lg text-brand-textMain mt-2">{plan.subject}</h3>
                <p className="text-xs font-bold text-brand-violet mb-3">
                  {plan.class_grade} • Teacher: <span className="text-brand-textMain">{plan.teacher_name}</span>
                </p>

                <div className="space-y-1.5 text-xs bg-brand-bg p-4 rounded-2xl border border-gray-100">
                  <p><strong>GES Strand:</strong> {plan.strand}</p>
                  <p><strong>Sub-Strand:</strong> {plan.sub_strand}</p>
                  <p><strong>Teaching Resources:</strong> <span className="text-gray-600">{plan.tlr || "Standard homeroom resources"}</span></p>
                </div>

                {plan.headmaster_notes && (
                  <div className={`mt-3 p-3 rounded-xl border text-xs ${
                    plan.status === 'Approved' ? 'bg-green-50 text-green-950 border-green-200' : 'bg-red-50 text-red-950 border-red-200'
                  }`}>
                    <strong className="block mb-0.5">Supervisory Note:</strong>
                    <span className="leading-relaxed">{plan.headmaster_notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className="flex-1 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Inspect Full Scheme
                </button>
                {plan.status === 'Pending' && (
                  <button
                    disabled={actionLoading}
                    onClick={() => handleApprove(plan)}
                    className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <i className="ph-bold ph-seal-check"></i> 1-Click Approve
                  </button>
                )}
                {plan.status === 'Pending' && (
                  <button
                    onClick={() => handleOpenRevisionModal(plan)}
                    className="px-3 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Revision
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL LESSON PLAN INSPECTION MODAL (Standard Reusable Component) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selectedPlan)}
        onClose={() => setSelectedPlan(null)}
        size="3xl"
        hideHeader
        bodyClassName="p-0 relative"
      >
        {selectedPlan && (
          <div className="flex flex-col">
            
            {/* Modal Top Banner Header */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 relative">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-lg">
                  {selectedPlan.scheme_code || selectedPlan.id.slice(0, 8)} • {selectedPlan.week}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedPlan.status === 'Approved'
                    ? 'bg-green-100 text-green-800'
                    : selectedPlan.status === 'Revision Requested'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedPlan.status === 'Approved' ? 'Official Digital Seal Affixed' : selectedPlan.status}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
                {selectedPlan.subject} Scheme of Work
              </h2>
              
              <div className="flex flex-wrap items-center gap-4 text-xs text-brand-textMuted mt-1.5 font-medium">
                <span>Class / Grade: <strong className="text-brand-textMain">{selectedPlan.class_grade}</strong></span>
                <span>•</span>
                <span>Submitted by: <strong className="text-brand-textMain">{selectedPlan.teacher_name}</strong></span>
                {selectedPlan.created_at && (
                  <>
                    <span>•</span>
                    <span>Date: <strong className="text-brand-textMain">{new Date(selectedPlan.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
              
              {/* APPROVED STATE: Official Supervisory Digital Seal Card */}
              {selectedPlan.status === 'Approved' && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 border border-green-200 text-green-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-green-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0">
                      <i className="ph-bold ph-seal-check"></i>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-green-800 block">
                        GES NaCCA Curricular Endorsement
                      </span>
                      <h4 className="font-serif font-bold text-base text-green-950">
                        Official Digital Seal Affixed
                      </h4>
                      <p className="text-xs text-green-800/90 mt-0.5">
                        Supervisory Authority: <strong>{selectedPlan.vetted_by || 'Headmaster'}</strong>
                        {selectedPlan.vetted_at && (
                          <span className="ml-1 text-[11px] text-green-700">
                            ({new Date(selectedPlan.vetted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right sm:border-l sm:border-green-200 sm:pl-4">
                    <span className="text-[10px] font-mono font-bold text-green-800 bg-green-200/70 px-2 py-1 rounded-md">
                      VERIFIED CURRICULUM
                    </span>
                  </div>
                </div>
              )}

              {/* REVISION REQUESTED STATE ALERT */}
              {selectedPlan.status === 'Revision Requested' && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
                    <i className="ph-bold ph-warning-circle"></i>
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-red-800">
                      Supervisory Feedback & Refinement Required
                    </h5>
                    <p className="text-xs text-red-950 mt-1 leading-relaxed">
                      {selectedPlan.headmaster_notes || "Teacher has been prompted to refine instructional delivery and differentiation."}
                    </p>
                  </div>
                </div>
              )}

              {/* Curricular Objectives */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-brand-textMain uppercase tracking-wider">
                  Curricular Objectives & Competencies
                </h4>
                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 text-xs text-gray-800 whitespace-pre-line leading-relaxed">
                  {selectedPlan.objectives || "Learners will develop critical thinking and problem-solving through hands-on engagement with physical manipulatives."}
                </div>
              </div>

              {/* 2-Column Strand and Sub-Strand Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase block">
                    GES National Strand
                  </span>
                  <p className="font-semibold text-xs text-brand-textMain">
                    {selectedPlan.strand}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase block">
                    Sub-Strand
                  </span>
                  <p className="font-semibold text-xs text-brand-textMain">
                    {selectedPlan.sub_strand}
                  </p>
                </div>
              </div>

              {/* Teaching & Learning Resources */}
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-brand-textMuted uppercase block">
                  Teaching & Learning Resources (TLRs)
                </span>
                <p className="text-xs text-brand-textMain font-medium">
                  {selectedPlan.tlr || "Standard classroom resources and subject reference materials."}
                </p>
              </div>

              {/* 3-Stage Pedagogical Delivery */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="font-serif font-bold text-sm text-brand-textMain uppercase tracking-wider">
                  3-Stage Pedagogical Delivery Breakdown
                </h4>

                <div className="space-y-3">
                  {selectedPlan.starter && (
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                      <span className="text-[11px] font-bold text-purple-900 uppercase flex items-center gap-1.5">
                        <i className="ph-bold ph-clock"></i> 1. Starter Activity (10 Mins)
                      </span>
                      <p className="text-xs text-purple-950 leading-relaxed">
                        {selectedPlan.starter}
                      </p>
                    </div>
                  )}

                  {selectedPlan.main_activity && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                      <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1.5">
                        <i className="ph-bold ph-book-open"></i> 2. Main Instructional Activity (25 Mins)
                      </span>
                      <p className="text-xs text-blue-950 leading-relaxed">
                        {selectedPlan.main_activity}
                      </p>
                    </div>
                  )}

                  {selectedPlan.plenary && (
                    <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-1">
                      <span className="text-[11px] font-bold text-teal-900 uppercase flex items-center gap-1.5">
                        <i className="ph-bold ph-check-circle"></i> 3. Plenary & Formative Assessment (10 Mins)
                      </span>
                      <p className="text-xs text-teal-950 leading-relaxed">
                        {selectedPlan.plenary}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Differentiated Learning Provisions */}
              {selectedPlan.differentiation && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 uppercase block">
                    Differentiated Learning Provisions
                  </span>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    {selectedPlan.differentiation}
                  </p>
                </div>
              )}

              {/* Supervisory Remark (if Approved) */}
              {selectedPlan.status === 'Approved' && selectedPlan.headmaster_notes && (
                <div className="p-4 rounded-2xl bg-green-50/80 border border-green-200 text-xs text-green-950 space-y-1">
                  <strong className="block text-[11px] uppercase font-bold text-green-900">
                    Supervisory Remark ({selectedPlan.vetted_by || 'Headmaster'}):
                  </strong>
                  <p className="leading-relaxed font-medium">{selectedPlan.headmaster_notes}</p>
                </div>
              )}

            </div>

            {/* Modal Footer Controls */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
              <div>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white hover:bg-gray-100 text-brand-textMain border border-gray-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <i className="ph-bold ph-printer"></i> Print Scheme
                </button>
              </div>

              <div className="flex items-center gap-3">
                {selectedPlan.status === 'Pending' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleOpenRevisionModal(selectedPlan)}
                      className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Request Revision
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(selectedPlan)}
                      className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <i className="ph-bold ph-seal-check"></i> 1-Click Approve & Seal
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedPlan(null)}
                    className="px-6 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark transition-all cursor-pointer"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* REQUEST REVISION MODAL (Standard Reusable Component) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={revisionModalOpen}
        onClose={() => { setRevisionModalOpen(false); setRevisionTargetPlan(null); }}
        size="lg"
        hideHeader
        bodyClassName="p-6 sm:p-8 relative"
      >
        {revisionTargetPlan && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => { setRevisionModalOpen(false); setRevisionTargetPlan(null); }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider block font-mono">
                Supervisory Feedback
              </span>
              <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-1">
                Request Curricular Revision
              </h3>
              <p className="text-xs text-brand-textMuted mt-1">
                Provide actionable pedagogical guidance for <strong>{revisionTargetPlan.teacher_name}</strong> ({revisionTargetPlan.subject} • {revisionTargetPlan.class_grade}).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">
                Supervisory Feedback & Refinement Notes *
              </label>
              <textarea
                rows={4}
                value={revisionFeedback}
                onChange={(e) => setRevisionFeedback(e.target.value)}
                placeholder="e.g. Please clarify the differentiated provisions for remedial tier..."
                className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-red-500 font-sans leading-relaxed"
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => { setRevisionModalOpen(false); setRevisionTargetPlan(null); }}
                className="px-4 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSubmitRevision}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? "Dispatching..." : "Dispatch Feedback"}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
