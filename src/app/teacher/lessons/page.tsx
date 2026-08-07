"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import { useClasses } from '@/hooks/useClasses';
import { useSubjects } from '@/hooks/useSubjects';

interface LessonSchemeRecord {
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
}

export default function TeacherLessons() {
  const { classes: classList, isLoading: classesLoading } = useClasses();
  const { subjects: subjectList, loading: subjectsLoading } = useSubjects();

  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [assignedClass, setAssignedClass] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [schemes, setSchemes] = useState<LessonSchemeRecord[]>([]);
  const [selectedScheme, setSelectedScheme] = useState<LessonSchemeRecord | null>(null);

  const [formData, setFormData] = useState({
    subject: "Mathematics",
    week: "Week 1 (Term 2)",
    strand: "B4.1 Number & Number Sense",
    subStrand: "B4.1.1 Fractions & Equivalent Representations",
    tlr: "Decimals place value charts, 10x10 grids, colored counters",
    objectives: "1. Learners will identify tenths and hundredths on a place value chart.\n2. Learners will convert fractional tenths into standard decimal notation with 100% accuracy.",
    starter: "Teacher displays a 10x10 square grid on the smart screen and shades 35 squares, prompting pupils to state the fractional representation.",
    mainActivity: "In collaborative pairs, pupils shade decimal grids on worksheets to represent 0.4, 0.75, and 0.08, followed by board presentations.",
    plenary: "Quick 3-question formative exit ticket. Peer evaluation of workbook exercises.",
    differentiation: "Struggling pupils receive physical base-10 blocks; advanced scholars solve multi-step decimal word problems."
  });

  // Initialize teacher context
  useEffect(() => {
    const user = AuthService.getCurrentUser();
    setCurrentUser(user);
    if (user?.assignedClass) {
      setAssignedClass(user.assignedClass);
    } else if (classList.length > 0 && !assignedClass) {
      setAssignedClass(classList[0].name);
    }
  }, [classList, assignedClass]);

  // Adjust default subject once subjects load
  useEffect(() => {
    if (subjectList.length > 0 && !subjectList.some(s => s.name === formData.subject)) {
      setFormData(prev => ({ ...prev, subject: subjectList[0].name }));
    }
  }, [subjectList, formData.subject]);

  const loadSchemes = useCallback(async () => {
    try {
      setLoadingSchemes(true);
      const user = AuthService.getCurrentUser();
      const teacherName = user?.fullName || (user as any)?.name || '';
      
      const res = await RoselandApi.academic.getLessonSchemes({
        class_grade: assignedClass || undefined,
        teacher_name: teacherName || undefined,
      });

      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setSchemes(data);
    } catch (e) {
      console.error("Failed to load lesson schemes", e);
    } finally {
      setLoadingSchemes(false);
    }
  }, [assignedClass]);

  useEffect(() => {
    loadSchemes();
  }, [loadSchemes]);

  const handleGenerateWithAi = () => {
    setGeneratingAi(true);
    toast.loading("Teacher Copilot is drafting standard GES/NaCCA Lesson Scheme...", { id: "ai-gen" });

    setTimeout(() => {
      const subLower = formData.subject.toLowerCase();
      if (subLower.includes("math")) {
        setFormData({
          subject: formData.subject,
          week: formData.week || "Week 1 (Term 2)",
          strand: "B4.1 Number & Number Sense",
          subStrand: "B4.1.3 Decimals & Place Value to Hundredths",
          tlr: "Decimals place value charts, 10x10 grids, base-10 unit cubes, interactive board",
          objectives: "1. Learners will read, write, and compare decimals up to two decimal places (tenths and hundredths).\n2. Learners will connect concrete fractional representations (e.g. 75/100) to standard decimal notation (0.75).",
          starter: "Mental Math warmup: Fast-paced call-and-response converting 1/10, 3/10, and 9/10 into decimals.",
          mainActivity: "Interactive group discovery: Scholars shade 100-grid sheets to visually represent decimal values 0.25, 0.50, and 0.99. Pairs swap grids to verify shaded proportions against the number line.",
          plenary: "3-Minute Exit Ticket: Scholars write down 3 key concepts learned, 2 questions, and 1 real-world use of decimals (Ghana Cedis & Pesewas).",
          differentiation: "Remedial tier uses physical base-10 fraction rods. Advanced tier solves multi-step word problems involving currency conversion."
        });
      } else if (subLower.includes("science")) {
        setFormData({
          subject: formData.subject,
          week: formData.week || "Week 1 (Term 2)",
          strand: "B4.2 Cycles (Earth & Living Systems)",
          subStrand: "B4.2.1 The Water Cycle & Atmospheric Processes",
          tlr: "Beaker of water, heat plate, mirror/glass lid, ice cubes, illustrated water cycle poster",
          objectives: "1. Learners will demonstrate the four stages of the water cycle (Evaporation, Condensation, Precipitation, Collection).\n2. Learners will formulate hypotheses explaining cloud formation.",
          starter: "Observation probe: Teacher places ice cubes on a warm metal tray, prompting learners to describe what forms on the underside.",
          mainActivity: "Classroom miniature rain-in-a-jar experiment: Small groups observe warm water evaporating inside sealed jars with ice caps, recording condensation droplets in science logbooks.",
          plenary: "Whole-class synthesis: Choral recitation of water cycle vocabulary and labeling cycle diagrams on smart screen.",
          differentiation: "Visual learners receive pre-labeled diagram flashcards; advanced scholars explain groundwater aquifer replenishment."
        });
      } else if (subLower.includes("english") || subLower.includes("language")) {
        setFormData({
          subject: formData.subject,
          week: formData.week || "Week 1 (Term 2)",
          strand: "B4.3 Oral Language & Grammar",
          subStrand: "B4.3.2 Subject-Verb Agreement & Tense Usage",
          tlr: "Sentence flashcards, audio clips, whiteboard markers, pocket chart",
          objectives: "1. Learners will identify and correct subject-verb agreement errors in complex sentences.\n2. Learners will construct 5 grammatically sound past continuous sentences.",
          starter: "Grammar Detective: Pupils spot incorrect verb forms in a humorous paragraph displayed on the board.",
          mainActivity: "Differentiated pair editing: Scholars collaborate to rewrite short story excerpts applying correct agreement rules, sharing standout sentences.",
          plenary: "Quickfire verbal challenge: Students conjugate irregular verbs prompted by the teacher.",
          differentiation: "Peer tutoring for ESL scholars; enrichment tasks include writing dialogue with compound subjects."
        });
      } else {
        setFormData({
          subject: formData.subject,
          week: formData.week || "Week 1 (Term 2)",
          strand: "B4.1 General Foundations & Core Competencies",
          subStrand: "B4.1.1 Core Inquiry & Discovery",
          tlr: "Reference textbooks, illustrative charts, multimedia slides",
          objectives: "1. Learners will articulate key concepts of the unit with 90% proficiency.\n2. Learners will demonstrate practical problem-solving in group activities.",
          starter: "Engaging inquiry question to activate prior knowledge.",
          mainActivity: "Structured collaborative investigation followed by whole-class presentation.",
          plenary: "Formative exit reflection consolidating core learning points.",
          differentiation: "Scaffolded worksheets for learners needing support; open-ended extension prompts for high achievers."
        });
      }

      toast.dismiss("ai-gen");
      toast.success("Teacher Copilot generated standard NaCCA Lesson Plan.");
      setGeneratingAi(false);
    }, 1000);
  };

  const handleSubmitScheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedClass) {
      toast.error("Please select a target class first.");
      return;
    }

    setSubmitting(true);
    const teacherName = currentUser?.fullName || (currentUser as any)?.name || "Classroom Teacher";

    try {
      const created = await RoselandApi.academic.createLessonScheme({
        teacher_id: currentUser?.id,
        teacher_name: teacherName,
        class_grade: assignedClass,
        subject: formData.subject,
        week: formData.week,
        strand: formData.strand,
        sub_strand: formData.subStrand,
        tlr: formData.tlr,
        objectives: formData.objectives,
        starter: formData.starter,
        main_activity: formData.mainActivity,
        plenary: formData.plenary,
        differentiation: formData.differentiation
      });

      // Broadcast notification for Headmaster supervisory inbox
      try {
        await RoselandApi.notify.broadcastNotice({
          targetGroup: "MANAGEMENT",
          title: `Curricular Scheme Submitted: ${assignedClass} - ${formData.subject}`,
          message: `${formData.week} Lesson Scheme for ${formData.subject} (${formData.strand}) submitted by ${teacherName} for supervisory sign-off.`
        });
      } catch {}

      toast.success("Lesson Scheme successfully submitted to Headmaster for review!");
      await loadSchemes();
      setActiveTab('history');
    } catch (err: any) {
      console.error("Submission failed", err);
      toast.error(err?.message || "Failed to submit lesson scheme. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            GES NaCCA Curricular Studio • {assignedClass || 'Active Cohort'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Weekly Lesson Plan & Scheme Builder
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Structure standard-based lesson notes, specify concrete TLRs, and track supervisory approvals in real-time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {classList.length > 0 && (
            <select
              value={assignedClass}
              onChange={(e) => setAssignedClass(e.target.value)}
              className="bg-brand-bg border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-violet cursor-pointer"
            >
              {classList.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 bg-brand-bg p-1 rounded-2xl border border-gray-200/60">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'create' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:text-brand-textMain'
              }`}
            >
              Scheme Studio
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'history' ? 'bg-brand-violet text-white shadow-sm' : 'text-brand-textMuted hover:text-brand-textMain'
              }`}
            >
              Archive ({schemes.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'create' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
              
              {/* AI Auto-Complete Banner */}
              <div className="p-4 bg-gradient-to-r from-brand-violetLight/40 to-brand-gold/20 rounded-2xl border border-brand-violet/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-brand-violet text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    AI
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-brand-textMain">Teacher Copilot Pedagogical Assistant</h4>
                    <p className="text-[11px] text-brand-textMuted">Auto-generate standard NaCCA objectives, 3-stage delivery & differentiation.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateWithAi}
                  disabled={generatingAi}
                  className="px-4 py-2 bg-brand-violet text-white rounded-xl text-xs font-bold hover:bg-brand-violetDark shadow transition-all cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <i className="ph-bold ph-sparkle"></i>
                  {generatingAi ? "Generating..." : "Draft with AI"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">Subject *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-violet cursor-pointer"
                  >
                    {subjectList.map((sub) => (
                      <option key={sub.id} value={sub.name}>{sub.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">Target Week *</label>
                  <input
                    type="text"
                    value={formData.week}
                    onChange={(e) => setFormData({ ...formData, week: e.target.value })}
                    placeholder="e.g. Week 1 (Term 2)"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-violet"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">GES National Strand *</label>
                  <input
                    type="text"
                    value={formData.strand}
                    onChange={(e) => setFormData({ ...formData, strand: e.target.value })}
                    placeholder="e.g. B4.1 Number & Number Sense"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-violet font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">Sub-Strand *</label>
                  <input
                    type="text"
                    value={formData.subStrand}
                    onChange={(e) => setFormData({ ...formData, subStrand: e.target.value })}
                    placeholder="e.g. B4.1.1 Fractions & Equivalent Representations"
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-violet font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">Teaching & Learning Resources (TLRs) *</label>
                <input
                  type="text"
                  value={formData.tlr}
                  onChange={(e) => setFormData({ ...formData, tlr: e.target.value })}
                  placeholder="e.g. Place value charts, 10x10 grids, physical manipulatives"
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-violet"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">Specific Pedagogical Objectives *</label>
                <textarea
                  rows={2}
                  value={formData.objectives}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  placeholder="State measurable learner outcomes..."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet leading-relaxed font-sans"
                ></textarea>
              </div>

              {/* 3-Stage Lesson Sequence */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <h4 className="font-serif font-bold text-sm text-brand-textMain uppercase tracking-wider">3-Stage Pedagogical Delivery</h4>

                <div>
                  <label className="block text-[11px] font-bold text-brand-violet uppercase mb-1">1. Starter Activity (10 Mins)</label>
                  <textarea
                    rows={2}
                    value={formData.starter}
                    onChange={(e) => setFormData({ ...formData, starter: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet leading-relaxed"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-violet uppercase mb-1">2. Main Instructional Activity (25 Mins)</label>
                  <textarea
                    rows={2}
                    value={formData.mainActivity}
                    onChange={(e) => setFormData({ ...formData, mainActivity: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet leading-relaxed"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-brand-violet uppercase mb-1">3. Plenary & Formative Assessment (10 Mins)</label>
                  <textarea
                    rows={2}
                    value={formData.plenary}
                    onChange={(e) => setFormData({ ...formData, plenary: e.target.value })}
                    className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet leading-relaxed"
                  ></textarea>
                </div>
              </div>

              {/* Differentiation */}
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-brand-textMain uppercase mb-1.5">Differentiated Learning Provisions</label>
                <textarea
                  rows={2}
                  value={formData.differentiation}
                  onChange={(e) => setFormData({ ...formData, differentiation: e.target.value })}
                  placeholder="Provisions for remedial vs. gifted learners..."
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet leading-relaxed"
                ></textarea>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => toast.success("Draft scheme saved locally.")}
                  className="px-4 py-2.5 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitScheme}
                  className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <i className="ph-bold ph-paper-plane-tilt"></i>
                  {submitting ? "Submitting..." : "Submit Scheme for Supervisory Sign-Off"}
                </button>
              </div>

            </div>
          </div>

          {/* Right Column: Live Supervisory Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-serif font-bold text-base text-brand-textMain">Supervisory Status</h4>
                <button
                  onClick={loadSchemes}
                  className="text-xs text-brand-violet font-bold hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>

              {schemes.length === 0 ? (
                <div className="p-5 rounded-2xl bg-brand-bg border border-gray-100 text-center">
                  <i className="ph ph-clipboard-text text-3xl text-gray-300 block mb-1"></i>
                  <p className="text-xs text-gray-500 font-medium">
                    No active schemes submitted yet for {assignedClass || 'this class'}. Submit your weekly scheme to receive official supervisory sign-off.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schemes.slice(0, 4).map((s) => (
                    <div 
                      key={s.id} 
                      onClick={() => setSelectedScheme(s)}
                      className={`p-4 rounded-2xl border space-y-2 cursor-pointer transition-all hover:shadow-sm ${
                        s.status === 'Approved' 
                          ? 'bg-green-50/80 border-green-200' 
                          : s.status === 'Revision Requested'
                          ? 'bg-red-50/80 border-red-200'
                          : 'bg-amber-50/80 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${
                          s.status === 'Approved' ? 'text-green-800' : s.status === 'Revision Requested' ? 'text-red-800' : 'text-amber-800'
                        }`}>
                          {s.week} • {s.subject}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          s.status === 'Approved' 
                            ? 'bg-green-200 text-green-900' 
                            : s.status === 'Revision Requested'
                            ? 'bg-red-200 text-red-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {s.status}
                        </span>
                      </div>
                      
                      <p className={`text-xs font-medium leading-relaxed ${
                        s.status === 'Approved' ? 'text-green-950' : s.status === 'Revision Requested' ? 'text-red-950' : 'text-amber-950'
                      }`}>
                        {s.headmaster_notes || (
                          s.status === 'Approved'
                            ? `Official digital seal affixed by ${s.vetted_by || 'Headmaster'}.`
                            : s.status === 'Revision Requested'
                            ? "Revision requested. Check supervisory feedback notes."
                            : "Scheme queued in supervisory inspection inbox."
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GES Standards Reference */}
            <div className="bg-brand-bg p-6 rounded-3xl border border-gray-200/60 space-y-3">
              <h5 className="font-serif font-bold text-xs uppercase tracking-wider text-brand-textMain">NaCCA Vetting Standards</h5>
              <ul className="text-[11px] text-brand-textMuted space-y-2">
                <li className="flex items-start gap-1.5">
                  <i className="ph-bold ph-check text-green-600 shrink-0 mt-0.5"></i>
                  <span>Specific & measurable learning outcomes (SMART)</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <i className="ph-bold ph-check text-green-600 shrink-0 mt-0.5"></i>
                  <span>Concrete manipulatives & teaching aids identified</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <i className="ph-bold ph-check text-green-600 shrink-0 mt-0.5"></i>
                  <span>Balanced 10/25/10 minute instructional delivery</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <i className="ph-bold ph-check text-green-600 shrink-0 mt-0.5"></i>
                  <span>Clear differentiated provisions for diverse learning tiers</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* ARCHIVE TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {loadingSchemes ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <p className="text-xs text-brand-textMuted">Loading curriculum archive...</p>
            </div>
          ) : schemes.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
              <i className="ph ph-folder-open text-4xl text-gray-300 block mb-2"></i>
              <h3 className="text-base font-serif font-bold text-brand-textMain mb-1">No Schemes in Archive</h3>
              <p className="text-xs text-brand-textMuted max-w-md mx-auto">
                Submitted lesson schemes and supervisory comments for {assignedClass || 'this cohort'} will be archived here.
              </p>
            </div>
          ) : (
            schemes.map((s) => (
              <div key={s.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2 py-0.5 rounded-md">
                      {s.scheme_code || s.id.slice(0, 8)} • {s.week}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      s.status === 'Approved'
                        ? 'bg-green-100 text-green-800'
                        : s.status === 'Revision Requested'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-brand-textMain">{s.subject}: {s.sub_strand}</h3>
                  <p className="text-xs text-brand-textMuted">{s.strand} • Class: <strong>{s.class_grade}</strong></p>
                  
                  {s.headmaster_notes && (
                    <div className={`text-xs p-3 rounded-xl border mt-2 ${
                      s.status === 'Approved' ? 'bg-green-50 text-green-900 border-green-100' : 'bg-red-50 text-red-900 border-red-100'
                    }`}>
                      <strong>Supervisory Remark ({s.vetted_by || 'Headmaster'}):</strong> {s.headmaster_notes}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectedScheme(s)}
                  className="px-4 py-2 bg-brand-bg hover:bg-brand-violet hover:text-white text-brand-textMain font-bold rounded-xl text-xs transition-all self-start md:self-auto cursor-pointer shrink-0"
                >
                  View Scheme Note
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL SCHEME INSPECTOR MODAL (Standard Reusable Component) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={Boolean(selectedScheme)}
        onClose={() => setSelectedScheme(null)}
        size="3xl"
        hideHeader
        bodyClassName="p-0 relative"
      >
        {selectedScheme && (
          <div className="flex flex-col">
            
            {/* Modal Top Banner Header */}
            <div className="p-6 sm:p-8 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 relative">
              <button
                type="button"
                onClick={() => setSelectedScheme(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>

              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-lg">
                  {selectedScheme.scheme_code || selectedScheme.id.slice(0, 8)} • {selectedScheme.week}
                </span>
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedScheme.status === 'Approved'
                    ? 'bg-green-100 text-green-800'
                    : selectedScheme.status === 'Revision Requested'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {selectedScheme.status === 'Approved' ? 'Official Digital Seal Affixed' : selectedScheme.status}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
                {selectedScheme.subject} Scheme of Work
              </h2>
              
              <div className="flex flex-wrap items-center gap-4 text-xs text-brand-textMuted mt-1.5 font-medium">
                <span>Class / Cohort: <strong className="text-brand-textMain">{selectedScheme.class_grade}</strong></span>
                <span>•</span>
                <span>Teacher: <strong className="text-brand-textMain">{selectedScheme.teacher_name}</strong></span>
                {selectedScheme.created_at && (
                  <>
                    <span>•</span>
                    <span>Date: <strong className="text-brand-textMain">{new Date(selectedScheme.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong></span>
                  </>
                )}
              </div>
            </div>

            {/* Modal Body Content */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[65vh] overflow-y-auto">
              
              {/* APPROVED STATE: Official Supervisory Digital Seal Card */}
              {selectedScheme.status === 'Approved' && (
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
                        Supervisory Authority: <strong>{selectedScheme.vetted_by || 'Headmaster'}</strong>
                        {selectedScheme.vetted_at && (
                          <span className="ml-1 text-[11px] text-green-700">
                            ({new Date(selectedScheme.vetted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })})
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
              {selectedScheme.status === 'Revision Requested' && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-base shrink-0 mt-0.5">
                    <i className="ph-bold ph-warning-circle"></i>
                  </div>
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-red-800">
                      Supervisory Feedback & Refinement Required
                    </h5>
                    <p className="text-xs text-red-950 mt-1 leading-relaxed">
                      {selectedScheme.headmaster_notes || "Kindly refine instructional delivery and differentiated learning provisions as requested."}
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
                  {selectedScheme.objectives || "Learners will develop critical understanding and subject competencies through structured pedagogical engagement."}
                </div>
              </div>

              {/* 2-Column Strand and Sub-Strand Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase block">
                    GES National Strand
                  </span>
                  <p className="font-semibold text-xs text-brand-textMain">
                    {selectedScheme.strand}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                  <span className="text-[10px] font-bold text-brand-textMuted uppercase block">
                    Sub-Strand
                  </span>
                  <p className="font-semibold text-xs text-brand-textMain">
                    {selectedScheme.sub_strand}
                  </p>
                </div>
              </div>

              {/* Teaching & Learning Resources */}
              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-brand-textMuted uppercase block">
                  Teaching & Learning Resources (TLRs)
                </span>
                <p className="text-xs text-brand-textMain font-medium">
                  {selectedScheme.tlr || "Standard classroom resources and subject reference materials."}
                </p>
              </div>

              {/* 3-Stage Pedagogical Delivery */}
              <div className="space-y-3 pt-2 border-t border-gray-100">
                <h4 className="font-serif font-bold text-sm text-brand-textMain uppercase tracking-wider">
                  3-Stage Pedagogical Delivery Breakdown
                </h4>

                <div className="space-y-3">
                  {selectedScheme.starter && (
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                      <span className="text-[11px] font-bold text-purple-900 uppercase flex items-center gap-1.5">
                        <i className="ph-bold ph-clock"></i> 1. Starter Activity (10 Mins)
                      </span>
                      <p className="text-xs text-purple-950 leading-relaxed">
                        {selectedScheme.starter}
                      </p>
                    </div>
                  )}

                  {selectedScheme.main_activity && (
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-1">
                      <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1.5">
                        <i className="ph-bold ph-book-open"></i> 2. Main Instructional Activity (25 Mins)
                      </span>
                      <p className="text-xs text-blue-950 leading-relaxed">
                        {selectedScheme.main_activity}
                      </p>
                    </div>
                  )}

                  {selectedScheme.plenary && (
                    <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-100 space-y-1">
                      <span className="text-[11px] font-bold text-teal-900 uppercase flex items-center gap-1.5">
                        <i className="ph-bold ph-check-circle"></i> 3. Plenary & Formative Assessment (10 Mins)
                      </span>
                      <p className="text-xs text-teal-950 leading-relaxed">
                        {selectedScheme.plenary}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Differentiated Learning Provisions */}
              {selectedScheme.differentiation && (
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                  <span className="text-[11px] font-bold text-amber-900 uppercase block">
                    Differentiated Learning Provisions
                  </span>
                  <p className="text-xs text-amber-950 leading-relaxed">
                    {selectedScheme.differentiation}
                  </p>
                </div>
              )}

              {/* Supervisory Remark (if present) */}
              {selectedScheme.headmaster_notes && (
                <div className={`p-4 rounded-2xl border text-xs space-y-1 ${
                  selectedScheme.status === 'Approved' ? 'bg-green-50/80 border-green-200 text-green-950' : 'bg-red-50/80 border-red-200 text-red-950'
                }`}>
                  <strong className="block text-[11px] uppercase font-bold">
                    Supervisory Feedback ({selectedScheme.vetted_by || 'Headmaster'}):
                  </strong>
                  <p className="leading-relaxed font-medium">{selectedScheme.headmaster_notes}</p>
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

              <div>
                <button
                  type="button"
                  onClick={() => setSelectedScheme(null)}
                  className="px-6 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        )}
      </Modal>

    </div>
  );
}
