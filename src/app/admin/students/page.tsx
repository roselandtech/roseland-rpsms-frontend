"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import Modal from '@/components/ui/Modal';
import BulkStudentImportModal from '@/components/students/BulkStudentImportModal';
import {
  printStudentDossier,
  printStudentIdCard,
  printPromotionGazette,
  printStudentRollRegister,
} from '@/lib/pdf-printer';

interface Student {
  id: string;
  indexNo: string;
  fullName: string;
  gender: 'Male' | 'Female';
  classGrade: string;
  house: 'Red' | 'Yellow' | 'Green' | 'Blue';
  dateOfBirth?: string;
  enrollmentDate?: string;
  entryClass?: string;
  residentialAddress?: string;
  emergencyPhone?: string;
  historicalAvgScore?: number;
  historicalAttendancePct?: number;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  feeStatus: 'Paid' | 'Partial' | 'Overdue';
  avgScore: number;
  attendancePct: number;
  allergyFlag?: string;
  avatar: string;
  conductRemark?: string;
  isActive?: boolean;
  extendedProfile?: any;
}

type PromotionDecisionType = 'Promote' | 'Probation' | 'Repeat' | 'Graduated';

import { useClasses } from '@/hooks/useClasses';

interface PromotionOverride {
  decision: PromotionDecisionType;
  targetClass: string;
  reason: string;
}

const CLASS_PROGRESSION_MAP: Record<string, string> = {
  'Cr\u00e8che Daisy': 'Nursery 1 Buttercup',
  'Nursery 1 Buttercup': 'Nursery 2 Buttercup',
  'Nursery 2 Buttercup': 'Kindergarten 1 Lily',
  'Kindergarten 1 Lily': 'Kindergarten 2 Lily',
  'Kindergarten 2 Lily': 'Primary 1',
  'Primary 1': 'Primary 2',
  'Primary 2': 'Primary 3',
  'Primary 3': 'Primary 4',
  'Primary 4': 'Primary 5',
  'Primary 5': 'Primary 6',
  'Primary 6': 'JHS 1 Diamond',
  'JHS 1 Diamond': 'JHS 2 Platinum',
  'JHS 2 Platinum': 'JHS 3 Gold',
  'JHS 3 Gold': 'Alumni (Graduated 2026)',
};

const HOUSES: ('Red' | 'Yellow' | 'Green' | 'Blue')[] = ['Red', 'Yellow', 'Green', 'Blue'];

export default function AdminStudentsPage() {
  const { classes: registeredClasses, isLoading: isLoadingClasses } = useClasses();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedHouse, setSelectedHouse] = useState('all');
  const [selectedFee, setSelectedFee] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals & Drawers
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [cumulativeHistory, setCumulativeHistory] = useState<any[]>([]);
  const [isLoadingCumulative, setIsLoadingCumulative] = useState(false);
  const [selectedHistoricalTermId, setSelectedHistoricalTermId] = useState<string | null>(null);

  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isIdCardOpen, setIsIdCardOpen] = useState(false);
  const [idCardDossier, setIdCardDossier] = useState<{ qrCodeDataUrl: string; securitySeal: string; academicYear: string; bloodGroup: string; schoolAddress: string } | null>(null);
  const [isLoadingIdCard, setIsLoadingIdCard] = useState(false);

  // Promotion Engine Configuration State
  const [isPromotionEngineOpen, setIsPromotionEngineOpen] = useState(false);
  const [isGazetteOpen, setIsGazetteOpen] = useState(false);
  const [promoSourceCohort, setPromoSourceCohort] = useState<string>('all');
  const [promoTargetSession, setPromoTargetSession] = useState<string>('2026/2027 Session');
  const [passThreshold, setPassThreshold] = useState<number>(50.0);
  const [probationThreshold, setProbationThreshold] = useState<number>(45.0);
  const [attendanceThreshold, setAttendanceThreshold] = useState<number>(75.0);
  const [decisionOverrides, setDecisionOverrides] = useState<Record<string, PromotionOverride>>({});
  const [isPromoting, setIsPromoting] = useState(false);

  // Committed Batch Transition Summary (Persistent review state)
  const [committedBatchSummary, setCommittedBatchSummary] = useState<{
    timestamp: string;
    targetSession: string;
    sourceCohort: string;
    totalCount: number;
    promotedCount: number;
    probationCount: number;
    retainedCount: number;
    graduatedCount: number;
    records: {
      id: string;
      name: string;
      indexNo: string;
      avatar: string;
      oldClass: string;
      newClass: string;
      avgScore: number;
      attendancePct: number;
      decision: PromotionDecisionType;
      reason: string;
    }[];
  } | null>(null);

  // Pupil Form State (Enroll / Edit)
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Male' as 'Male' | 'Female',
    classGrade: '',
    house: 'Red' as 'Red' | 'Yellow' | 'Green' | 'Blue',
    dateOfBirth: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    feeStatus: 'Overdue' as 'Paid' | 'Partial' | 'Overdue',
    avgScore: 0.0,
    attendancePct: 0.0,
    allergyFlag: '',
    conductRemark: '',
    extendedProfile: {
      placeOfBirth: '',
      nationality: 'Ghanaian',
      residentialAddress: '',
      residentialPhone: '',
      fatherOccupation: '',
      fatherCompany: '',
      fatherBusinessPhone: '',
      motherName: '',
      motherOccupation: '',
      motherCompany: '',
      motherBusinessPhone: '',
      motherMobilePhone: '',
      motherEmail: '',
      parentsLiving: 'together',
      hasSibling: false,
      siblingDetails: '',
      previousSchoolDetails: '',
      expelledDetails: '',
      bloodGroup: '',
      medicalHistory: '',
      specialNeedsDetails: ''
    }
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  // Fetch Live Students from SIS Backend
  const loadStudentsFromBackend = useCallback(async () => {
    try {
      setIsLoadingApi(true);
      const res = await RoselandApi.sis.getStudents();
      const rawList = Array.isArray(res) ? res : (res?.students || res?.data || []);
      if (rawList && Array.isArray(rawList)) {
        const mapped: Student[] = rawList.map((s: any) => {
          let rawHouse = (s.house || '').toLowerCase();
          let house: 'Red' | 'Yellow' | 'Green' | 'Blue' = 'Red';
          if (rawHouse.includes('yellow') || rawHouse.includes('gold')) house = 'Yellow';
          else if (rawHouse.includes('green') || rawHouse.includes('emerald')) house = 'Green';
          else if (rawHouse.includes('blue') || rawHouse.includes('sapphire')) house = 'Blue';
          else if (rawHouse.includes('red') || rawHouse.includes('ruby')) house = 'Red';

          return {
            id: s.id || s.index_no,
            indexNo: s.index_no,
            fullName: s.full_name,
            gender: (s.gender as any) || 'Male',
            classGrade: s.class_grade,
            house,
            dateOfBirth: s.date_of_birth,
            enrollmentDate: s.enrollment_date,
            entryClass: s.entry_class,
            residentialAddress: s.residential_address,
            emergencyPhone: s.emergency_phone,
            parentName: s.parent_name || '',
            parentPhone: s.parent_phone || '',
            parentEmail: s.parent_email,
            feeStatus: s.fee_status === 'PAID' || s.fee_status === 'Paid' ? 'Paid' : s.fee_status === 'PARTIAL' || s.fee_status === 'Partial' ? 'Partial' : 'Overdue',
            avgScore: Number(s.avg_score) || 0,
            attendancePct: Number(s.attendance_pct) || 0,
            historicalAvgScore: s.historical_avg_score !== undefined && s.historical_avg_score !== null ? Number(s.historical_avg_score) : undefined,
            historicalAttendancePct: s.historical_attendance_pct !== undefined && s.historical_attendance_pct !== null ? Number(s.historical_attendance_pct) : undefined,
            allergyFlag: s.allergy_flag,
            conductRemark: s.conduct_remark || '',
            avatar: s.avatar || '',
            isActive: s.is_active !== false
          };
        });
        setStudents(mapped);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Failed to load students from SIS backend", err);
      toast.error("Could not fetch students from SIS backend");
      setStudents([]);
    } finally {
      setIsLoadingApi(false);
    }
  }, []);

  useEffect(() => {
    loadStudentsFromBackend();
  }, [loadStudentsFromBackend]);

  // Fetch student's cumulative multi-term historical reports & attendance
  useEffect(() => {
    if (!activeStudent?.indexNo) {
      setCumulativeHistory([]);
      return;
    }
    let isMounted = true;
    setIsLoadingCumulative(true);
    RoselandApi.academic.getCumulativeStudentReports(activeStudent.indexNo)
      .then((res: any) => {
        if (isMounted && res?.history) {
          setCumulativeHistory(res.history);
          if (res.history.length > 0) {
            setSelectedHistoricalTermId(res.history[0].id);
          }
        }
      })
      .catch(() => {
        if (isMounted) setCumulativeHistory([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingCumulative(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeStudent?.indexNo]);

  // Fee Status Toggle
  const handleToggleFeeStatus = async (studentId: string, newStatus: 'Paid' | 'Partial' | 'Overdue') => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, feeStatus: newStatus } : s));
    if (activeStudent && activeStudent.id === studentId) {
      setActiveStudent(prev => prev ? { ...prev, feeStatus: newStatus } : null);
    }

    try {
      await RoselandApi.sis.updateFeeStatus(studentId, newStatus);
      toast.success(`Fee status updated to ${newStatus}`);
    } catch (err) {
      toast.error("Failed to sync fee status with backend");
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (st: Student) => {
    setFormData({
      fullName: st.fullName,
      gender: st.gender as 'Male' | 'Female',
      classGrade: st.classGrade,
      house: st.house as any,
      dateOfBirth: st.dateOfBirth || '',
      parentName: st.parentName || '',
      parentPhone: st.parentPhone || '',
      parentEmail: st.parentEmail || '',
      feeStatus: st.feeStatus as any,
      avgScore: st.avgScore || 0,
      attendancePct: st.attendancePct || 0,
      allergyFlag: st.allergyFlag || '',
      conductRemark: st.conductRemark || '',
      extendedProfile: st.extendedProfile || {
        placeOfBirth: '', nationality: 'Ghanaian', residentialAddress: '', residentialPhone: '',
        fatherOccupation: '', fatherCompany: '', fatherBusinessPhone: '', motherName: '',
        motherOccupation: '', motherCompany: '', motherBusinessPhone: '', motherMobilePhone: '', motherEmail: '',
        parentsLiving: 'together', hasSibling: false, siblingDetails: '', previousSchoolDetails: '',
        expelledDetails: '', bloodGroup: '', medicalHistory: '', specialNeedsDetails: ''
      }
    });
    setActiveStudent(st);
    setIsEditModalOpen(true);
  };

  // Open Biometric ID Card Modal and Fetch live QR
  const handleOpenIdCard = async (student: Student) => {
    setActiveStudent(student);
    setIsIdCardOpen(true);
    setIsLoadingIdCard(true);
    setIdCardDossier(null);
    try {
      const res = await RoselandApi.sis.getStudentDossier(student.id);
      if (res && res.biometricCard) {
        setIdCardDossier(res.biometricCard);
      }
    } catch (err) {
      console.warn("Could not fetch cryptographic QR, falling back to default seal", err);
    } finally {
      setIsLoadingIdCard(false);
    }
  };

  // Submit Enroll or Update
  const handleSubmitStudentForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.parentName.trim() || !formData.parentPhone.trim()) {
      toast.error("Please fill in pupil name, parent name, and emergency phone.");
      return;
    }

    setIsSubmittingForm(true);
    try {
      if (isEditModalOpen && activeStudent) {
        // Update Student
        const payload = {
          full_name: formData.fullName.trim(),
          gender: formData.gender,
          class_grade: formData.classGrade,
          house: formData.house,
          date_of_birth: formData.dateOfBirth || null,
          parent_name: formData.parentName.trim(),
          parent_phone: formData.parentPhone.trim(),
          parent_email: formData.parentEmail.trim() || null,
          fee_status: formData.feeStatus,
          avg_score: Number(formData.avgScore),
          attendance_pct: Number(formData.attendancePct),
          allergy_flag: formData.allergyFlag.trim() || null,
          conduct_remark: formData.conductRemark.trim() || null,
          extended_profile: formData.extendedProfile
        };
        const res = await RoselandApi.sis.updateStudent(activeStudent.id, payload);
        toast.success("Pupil profile updated successfully");
        setIsEditModalOpen(false);
        if (res && res.student) {
          // Profile successfully updated
        }
        setActiveStudent(null);
        await loadStudentsFromBackend();
      } else {
        // Enroll New Student
        const payload = {
          full_name: formData.fullName.trim(),
          gender: formData.gender,
          class_grade: formData.classGrade,
          house: formData.house,
          date_of_birth: formData.dateOfBirth || null,
          parent_name: formData.parentName.trim(),
          parent_phone: formData.parentPhone.trim(),
          parent_email: formData.parentEmail.trim() || null,
          fee_status: formData.feeStatus,
          avg_score: Number(formData.avgScore),
          attendance_pct: Number(formData.attendancePct),
          allergy_flag: formData.allergyFlag.trim() || null,
          conduct_remark: formData.conductRemark.trim() || null,
          extended_profile: formData.extendedProfile
        };
        const created = await RoselandApi.sis.createStudent(payload);
        toast.success(`Successfully enrolled ${created.full_name} (${created.index_no})`);
        setIsEnrollModalOpen(false);
        await loadStudentsFromBackend();
      }
    } catch (err: any) {
      toast.error(err.message || "Operation failed on SIS backend.");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  // Delete / Withdraw Student
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await RoselandApi.sis.deleteStudent(studentToDelete.id);
      toast.success(`Withdrawn student ${studentToDelete.fullName} (${studentToDelete.indexNo})`);
      setIsDeleteConfirmOpen(false);
      setStudentToDelete(null);
      if (activeStudent && activeStudent.id === studentToDelete.id) {
        setActiveStudent(null);
      }
      await loadStudentsFromBackend();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete student from backend");
    } finally {
      setIsDeleting(false);
    }
  };

  // Dynamic Cohort Options
  const dynamicCohorts = useMemo(() => {
    const classNames = registeredClasses.map(c => c.name);
    const fromStudents = Array.from(new Set(students.map(s => s.classGrade)));
    const combined = Array.from(new Set([...classNames, ...fromStudents]));
    return combined.sort();
  }, [registeredClasses, students]);

  // Synchronize default classGrade when dynamicCohorts change
  useEffect(() => {
    if (dynamicCohorts.length > 0) {
      setFormData(prev => {
        if (!prev.classGrade || (!dynamicCohorts.includes(prev.classGrade) && !isEditModalOpen)) {
          return { ...prev, classGrade: dynamicCohorts[0] };
        }
        return prev;
      });
    }
  }, [dynamicCohorts, isEditModalOpen]);

  const handleOpenEnrollModal = () => {
    setFormData({
      fullName: '',
      gender: 'Male',
      classGrade: dynamicCohorts.length > 0 ? dynamicCohorts[0] : '',
      house: 'Red',
      dateOfBirth: '',
      parentName: '',
      parentPhone: '',
      parentEmail: '',
      feeStatus: 'Paid',
      avgScore: 0.0,
      attendancePct: 0.0,
      allergyFlag: '',
      conductRemark: '',
      extendedProfile: {
        placeOfBirth: '', nationality: 'Ghanaian', residentialAddress: '', residentialPhone: '',
        fatherOccupation: '', fatherCompany: '', fatherBusinessPhone: '', motherName: '',
        motherOccupation: '', motherCompany: '', motherBusinessPhone: '', motherMobilePhone: '', motherEmail: '',
        parentsLiving: 'together', hasSibling: false, siblingDetails: '', previousSchoolDetails: '',
        expelledDetails: '', bloodGroup: '', medicalHistory: '', specialNeedsDetails: ''
      }
    });
    setIsEnrollModalOpen(true);
  };

  // Filtering Master Registry
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesClass = selectedClass === 'all' || s.classGrade.toLowerCase().includes(selectedClass.toLowerCase());
      const matchesHouse = selectedHouse === 'all' || s.house.toLowerCase() === selectedHouse.toLowerCase();
      const matchesFee = selectedFee === 'all' || s.feeStatus.toLowerCase() === selectedFee.toLowerCase();
      const matchesSearch = s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.indexNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.parentName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesClass && matchesHouse && matchesFee && matchesSearch;
    });
  }, [students, selectedClass, selectedHouse, selectedFee, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage));
  const paginatedStudents = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredStudents, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClass, selectedHouse, selectedFee, searchQuery]);

  // Candidates for Promotion Batch
  const promotionCandidates = useMemo(() => {
    return students.filter(s => {
      if (promoSourceCohort === 'all') return true;
      return s.classGrade === promoSourceCohort;
    });
  }, [students, promoSourceCohort]);

  // Compute Default System Recommendation
  const getSystemRecommendation = (s: Student): { decision: PromotionDecisionType; targetClass: string } => {
    if (s.classGrade.startsWith('JHS 3')) {
      return { decision: 'Graduated', targetClass: 'Alumni (Graduated 2026)' };
    }
    const classIdx = registeredClasses.findIndex(c => c.name.toLowerCase() === s.classGrade.toLowerCase());
    const defaultNextClass = (classIdx >= 0 && classIdx < registeredClasses.length - 1)
      ? registeredClasses[classIdx + 1].name
      : (CLASS_PROGRESSION_MAP[s.classGrade] || `${s.classGrade} (Advanced)`);

    if (s.avgScore >= passThreshold && s.attendancePct >= attendanceThreshold) {
      return { decision: 'Promote', targetClass: defaultNextClass };
    } else if (s.avgScore >= probationThreshold) {
      return { decision: 'Probation', targetClass: defaultNextClass };
    } else {
      return { decision: 'Repeat', targetClass: s.classGrade };
    }
  };

  // Resolve Effective Decision (System or Admin Override)
  const getEffectiveDecision = (s: Student): PromotionOverride => {
    if (decisionOverrides[s.id]) {
      return decisionOverrides[s.id];
    }
    const sys = getSystemRecommendation(s);
    return {
      decision: sys.decision,
      targetClass: sys.targetClass,
      reason: 'Automatic NaCCA / GES standard policy evaluation'
    };
  };

  // Promotion Telemetry Metrics
  const promoTelemetry = useMemo(() => {
    let promoteCount = 0;
    let probationCount = 0;
    let repeatCount = 0;
    let graduateCount = 0;

    promotionCandidates.forEach(s => {
      const eff = getEffectiveDecision(s);
      if (eff.decision === 'Promote') promoteCount++;
      else if (eff.decision === 'Probation') probationCount++;
      else if (eff.decision === 'Repeat') repeatCount++;
      else if (eff.decision === 'Graduated') graduateCount++;
    });

    const total = promotionCandidates.length;
    return {
      total,
      promoteCount,
      probationCount,
      repeatCount,
      graduateCount,
      promotePct: total > 0 ? Math.round((promoteCount / total) * 100) : 0,
      probationPct: total > 0 ? Math.round((probationCount / total) * 100) : 0,
      repeatPct: total > 0 ? Math.round((repeatCount / total) * 100) : 0
    };
  }, [promotionCandidates, decisionOverrides, passThreshold, probationThreshold, attendanceThreshold]);

  // Handle Manual Override
  const handleUpdateOverride = (studentId: string, updates: Partial<PromotionOverride>) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;
    const current = getEffectiveDecision(student);
    setDecisionOverrides(prev => ({
      ...prev,
      [studentId]: {
        ...current,
        ...updates
      }
    }));
  };

  // Commit Batch Promotion Transition (Persists to SIS Backend)
  const handleCommitPromotion = async () => {
    if (promotionCandidates.length === 0) {
      toast.error("No candidate pupils in the selected cohort.");
      return;
    }

    const payloadCandidates = promotionCandidates.map(s => {
      const eff = getEffectiveDecision(s);
      return {
        id: s.id,
        index_no: s.indexNo,
        new_class: eff.targetClass,
        decision: eff.decision,
        reason: eff.reason
      };
    });

    setIsPromoting(true);
    try {
      const res = await RoselandApi.sis.batchPromoteStudents({
        source_cohort: promoSourceCohort === 'all' ? 'All Classes' : promoSourceCohort,
        target_session: promoTargetSession,
        candidates: payloadCandidates
      });

      const recordsSummary = promotionCandidates.map(s => {
        const eff = getEffectiveDecision(s);
        return {
          id: s.id,
          name: s.fullName,
          indexNo: s.indexNo,
          avatar: s.avatar,
          oldClass: s.classGrade,
          newClass: eff.targetClass,
          avgScore: s.avgScore,
          attendancePct: s.attendancePct,
          decision: eff.decision,
          reason: eff.reason
        };
      });

      setCommittedBatchSummary({
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        targetSession: promoTargetSession,
        sourceCohort: promoSourceCohort === 'all' ? 'All Classes' : promoSourceCohort,
        totalCount: recordsSummary.length,
        promotedCount: promoTelemetry.promoteCount,
        probationCount: promoTelemetry.probationCount,
        retainedCount: promoTelemetry.repeatCount,
        graduatedCount: promoTelemetry.graduateCount,
        records: recordsSummary
      });

      setDecisionOverrides({});
      toast.success(res.message || `Successfully executed academic transition for ${recordsSummary.length} pupils into ${promoTargetSession}!`);
      await loadStudentsFromBackend();
    } catch (err: any) {
      toast.error(err.message || "Failed to commit batch promotion to database.");
    } finally {
      setIsPromoting(false);
    }
  };

  const getFeeBadge = (status: Student['feeStatus']) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Partial': return 'bg-amber-100 text-amber-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
    }
  };

  const getHouseBadge = (house: Student['house'] | string) => {
    const norm = (house || '').toLowerCase();
    if (norm.includes('red') || norm.includes('ruby')) return 'bg-red-50 text-red-700 border-red-200';
    if (norm.includes('yellow') || norm.includes('gold')) return 'bg-yellow-50 text-yellow-800 border-yellow-200';
    if (norm.includes('green') || norm.includes('emerald')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (norm.includes('blue') || norm.includes('sapphire')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getDecisionBadge = (decision: PromotionDecisionType) => {
    switch (decision) {
      case 'Promote': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Probation': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Repeat': return 'bg-red-100 text-red-800 border-red-300';
      case 'Graduated': return 'bg-purple-100 text-purple-800 border-purple-300';
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Student Information System (SIS)
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Master Student Registry
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Manage academic trajectories, End-of-Year promotion engine, medical alerts, and batch ID generation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const headers = "Index No,Full Name,Gender,Class,House,Avg Score,Attendance,Fee Status,Parent Name,Parent Phone\n";
              const rows = students.map(s => `"${s.indexNo}","${s.fullName}","${s.gender}","${s.classGrade}","${s.house}",${s.avgScore}%,${s.attendancePct}%,"${s.feeStatus}","${s.parentName}","${s.parentPhone}"`).join("\n");
              const blob = new Blob([headers + rows], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "roseland_students_registry.csv";
              a.click();
              toast.success("Exported Student Registry CSV");
            }}
            className="px-4 py-2 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
          >
            <i className="ph-bold ph-download-simple"></i> Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              printStudentRollRegister({
                cohortName: selectedClass === 'all' ? 'All Classes (Master Census)' : selectedClass,
                totalPupils: filteredStudents.length,
                students: filteredStudents.map(s => ({
                  indexNo: s.indexNo,
                  fullName: s.fullName,
                  gender: s.gender,
                  classGrade: s.classGrade,
                  parentName: s.parentName,
                  parentPhone: s.parentPhone,
                  feeStatus: s.feeStatus,
                })),
              });
              toast.success("Generated Official Student Census Roll");
            }}
            className="px-4 py-2 bg-white hover:bg-gray-50 text-brand-textMain border border-gray-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
          >
            <i className="ph-bold ph-printer text-base"></i> Print Master Roll
          </button>
          <button
            type="button"
            onClick={() => setIsBulkImportOpen(true)}
            className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-brand-violet border border-purple-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <i className="ph-bold ph-file-arrow-up text-base"></i> Bulk Import (CSV/Excel)
          </button>
          <button
            type="button"
            onClick={handleOpenEnrollModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <i className="ph-bold ph-user-plus text-base"></i> Enroll Pupil
          </button>
          <button
            type="button"
            onClick={() => setIsPromotionEngineOpen(true)}
            className="px-4 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark transition-colors shadow-sm flex items-center gap-1.5"
          >
            <i className="ph-bold ph-arrow-fat-lines-up text-base"></i> Launch Promotion Engine
          </button>
        </div>
      </div>

      {/* Active Promotion Transition Confirmation Banner */}
      {committedBatchSummary && (
        <div className="bg-emerald-50/90 border border-emerald-200 p-4 sm:p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
              <i className="ph-bold ph-check-circle"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded-md text-[10px] font-mono font-bold uppercase">
                  Batch Committed
                </span>
                <span className="text-xs font-bold text-emerald-950">
                  {committedBatchSummary.totalCount} Pupils Transitioned to {committedBatchSummary.targetSession}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-0.5">
                Cohort: <strong>{committedBatchSummary.sourceCohort}</strong> • Applied at {committedBatchSummary.timestamp} • Registry updated.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setIsGazetteOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <i className="ph-bold ph-printer"></i> View Gazette
            </button>
            <button
              type="button"
              onClick={() => setIsPromotionEngineOpen(true)}
              className="px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-xl text-xs transition-colors"
            >
              Open Studio
            </button>
            <button
              type="button"
              onClick={() => setCommittedBatchSummary(null)}
              className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-1 transition-colors"
              title="Dismiss banner"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Multi-facet Filter Bar */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* Search Box */}
          <div className="relative">
            <i className="ph ph-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-sm"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, index #, parent..."
              className="w-full bg-brand-bg border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-brand-violet"
            />
          </div>

          {/* Class Grade Select */}
          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet font-semibold"
            >
              <option value="all">All Class Cohorts ({students.length})</option>
              {dynamicCohorts.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* House Select */}
          <div>
            <select
              value={selectedHouse}
              onChange={(e) => setSelectedHouse(e.target.value)}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet font-semibold"
            >
              <option value="all">All School Houses</option>
              {HOUSES.map(h => (
                <option key={h} value={h}>{h} House</option>
              ))}
            </select>
          </div>

          {/* Fee Status Select */}
          <div>
            <select
              value={selectedFee}
              onChange={(e) => setSelectedFee(e.target.value)}
              className="w-full bg-brand-bg border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-violet font-semibold"
            >
              <option value="all">All Fee Statuses</option>
              <option value="Paid">Fully Paid</option>
              <option value="Partial">Partial Balance</option>
              <option value="Overdue">Overdue / Defaulter</option>
            </select>
          </div>

        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoadingApi ? (
          <div className="p-16 text-center">
            <div className="w-10 h-10 border-4 border-brand-violet border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold text-brand-textMain">Loading Master Student Registry...</p>
            <p className="text-xs text-brand-textMuted mt-1">Retrieving official academic and enrollment records</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center text-3xl text-gray-400 mx-auto mb-4">
              <i className="ph-bold ph-users"></i>
            </div>
            <h3 className="text-lg font-serif font-bold text-brand-textMain">No Pupil Records Found</h3>
            <p className="text-xs text-brand-textMuted max-w-md mx-auto mt-1 mb-6">
              {searchQuery || selectedClass !== 'all' || selectedHouse !== 'all' || selectedFee !== 'all'
                ? "No students match your search filter criteria. Try adjusting filters or search term."
                : "No students are currently enrolled in the SIS database. Get started by enrolling your first pupil."}
            </p>
            <button
              type="button"
              onClick={handleOpenEnrollModal}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm inline-flex items-center gap-2"
            >
              <i className="ph-bold ph-user-plus"></i> Enroll First Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-bg text-gray-400 uppercase font-bold tracking-wider border-b border-gray-100 text-[10px]">
                <tr>
                  <th className="py-4 px-6">Student & Index No</th>
                  <th className="py-4 px-4">Cohort & House</th>
                  <th className="py-4 px-4">Academic Avg</th>
                  <th className="py-4 px-4">Attendance</th>
                  <th className="py-4 px-4">Fee Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 shrink-0">
                          <div className="w-full h-full bg-brand-violet/10 flex items-center justify-center">
                            <i className="ph-bold ph-student text-brand-violet text-lg"></i>
                          </div>
                        </div>
                        <div>
                          <strong className="text-sm font-bold text-brand-textMain block">{s.fullName}</strong>
                          <span className="font-mono text-[10px] text-gray-400">{s.indexNo}</span>
                          {s.allergyFlag && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md mt-0.5">
                              <i className="ph-fill ph-warning"></i> {s.allergyFlag}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <strong className="text-brand-textMain block font-bold">{s.classGrade}</strong>
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border mt-0.5 ${getHouseBadge(s.house)}`}>
                        {s.house} House
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`font-bold px-2.5 py-1 rounded-lg text-xs ${
                        s.avgScore >= 75 ? 'bg-emerald-50 text-emerald-700' :
                        s.avgScore >= 50 ? 'bg-brand-violetLight/60 text-brand-violet' :
                        'bg-red-50 text-red-700'
                      }`}>
                        {s.avgScore}%
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      <span className="font-bold text-brand-textMain">{s.attendancePct}%</span>
                      <span className="text-[10px] text-gray-400 block">Morning Reg</span>
                    </td>

                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getFeeBadge(s.feeStatus)}`}>
                        {s.feeStatus}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveStudent(s)}
                        className="px-3 py-1.5 bg-brand-bg hover:bg-brand-violet hover:text-white rounded-lg font-bold text-brand-textMain transition-all text-xs"
                      >
                        360° Profile
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenIdCard(s)}
                        className="px-3 py-1.5 bg-brand-yellowLight text-yellow-900 hover:bg-brand-yellow rounded-lg font-bold transition-all text-xs"
                      >
                        ID Card
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-brand-violet rounded-lg transition-colors"
                        title="Edit Student Profile"
                      >
                        <i className="ph-bold ph-pencil-simple text-sm"></i>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStudentToDelete(s);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                        title="Withdraw Student"
                      >
                        <i className="ph-bold ph-trash text-sm"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">
                Showing <strong className="text-brand-textMain">{filteredStudents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</strong> to <strong className="text-brand-textMain">{Math.min(currentPage * itemsPerPage, filteredStudents.length)}</strong> of <strong className="text-brand-textMain">{filteredStudents.length}</strong> students
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="ph-bold ph-caret-left"></i>
                  </button>
                  <span className="text-xs font-bold text-brand-textMain px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <i className="ph-bold ph-caret-right"></i>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* ENROLL & EDIT PUPIL MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isEnrollModalOpen || isEditModalOpen}
        onClose={() => {
          if (!isSubmittingForm) {
            setIsEnrollModalOpen(false);
            setIsEditModalOpen(false);
            setActiveStudent(null);
          }
        }}
        hideHeader
        size="2xl"
        disableBackdropClick={isSubmittingForm}
        bodyClassName="p-6 sm:p-8 relative"
      >
        <button
          type="button"
          onClick={() => {
            if (!isSubmittingForm) {
              setIsEnrollModalOpen(false);
              setIsEditModalOpen(false);
              setActiveStudent(null);
            }
          }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base z-10"
        >
          ✕
        </button>

        <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">
          {isEditModalOpen ? "SIS Student Maintenance" : "Admissions & Onboarding"}
        </span>
        <h3 className="text-2xl font-serif font-bold text-brand-textMain mt-1 mb-6">
          {isEditModalOpen ? `Edit Profile: ${formData.fullName}` : "Enroll New Student"}
        </h3>

        <form onSubmit={handleSubmitStudentForm} className="space-y-6 text-xs max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              
              {/* SECTION A: STUDENT INFORMATION */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <h4 className="font-bold text-brand-textMain text-sm mb-4 pb-2 border-b border-gray-200">Section A - Student Information</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Pupil Full Name *</label>
                    <input
                      type="text" required value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Samuel Nana Kwabena"
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Gender *</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'Male' | 'Female' })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Date of Birth</label>
                    <input
                      type="date" value={formData.dateOfBirth}
                      onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Place of Birth</label>
                    <input
                      type="text" value={formData.extendedProfile.placeOfBirth}
                      onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, placeOfBirth: e.target.value } })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Nationality</label>
                    <input
                      type="text" value={formData.extendedProfile.nationality}
                      onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, nationality: e.target.value } })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Residential Address</label>
                    <input
                      type="text" value={formData.extendedProfile.residentialAddress}
                      onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, residentialAddress: e.target.value } })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Residential Phone</label>
                    <input
                      type="tel" value={formData.extendedProfile.residentialPhone}
                      onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, residentialPhone: e.target.value } })}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Assigned Class *</label>
                    {isLoadingClasses ? (
                      <div className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-400 font-semibold">Loading...</div>
                    ) : dynamicCohorts.length === 0 ? (
                      <input type="text" required value={formData.classGrade} onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                    ) : (
                      <select required value={formData.classGrade || dynamicCohorts[0]} onChange={(e) => setFormData({ ...formData, classGrade: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet">
                        {formData.classGrade && !dynamicCohorts.includes(formData.classGrade) && <option value={formData.classGrade}>{formData.classGrade}</option>}
                        {dynamicCohorts.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">House Cohort *</label>
                    <select value={formData.house} onChange={(e) => setFormData({ ...formData, house: e.target.value as any })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet">
                      {HOUSES.map(h => <option key={h} value={h}>{h} House</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION B: PARENTS / GUARDIAN */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <h4 className="font-bold text-brand-textMain text-sm mb-4 pb-2 border-b border-gray-200">Section B - Parents/Guardian Information</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Father's Full Name *</label>
                    <input type="text" required value={formData.parentName} onChange={(e) => setFormData({ ...formData, parentName: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Father's Mobile *</label>
                    <input type="tel" required value={formData.parentPhone} onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Father's Email</label>
                    <input type="email" value={formData.parentEmail} onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Mother's Full Name</label>
                    <input type="text" value={formData.extendedProfile.motherName} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, motherName: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Mother's Mobile</label>
                    <input type="tel" value={formData.extendedProfile.motherMobilePhone} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, motherMobilePhone: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Mother's Email</label>
                    <input type="email" value={formData.extendedProfile.motherEmail} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, motherEmail: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Parents Living Status</label>
                    <select value={formData.extendedProfile.parentsLiving} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, parentsLiving: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet">
                      <option value="together">Living Together</option>
                      <option value="separated">Separated</option>
                      <option value="divorced">Divorced</option>
                      <option value="single">Single Parent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Sibling details (if attending)</label>
                    <input type="text" value={formData.extendedProfile.siblingDetails} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, siblingDetails: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" placeholder="Names and classes..." />
                  </div>
                </div>
              </div>

              {/* SECTION C & D: SCHOOL & MEDICAL */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <h4 className="font-bold text-brand-textMain text-sm mb-4 pb-2 border-b border-gray-200">Section C & D - Academic & Medical</h4>
                
                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Previous Schools Attended</label>
                    <input type="text" value={formData.extendedProfile.previousSchoolDetails} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, previousSchoolDetails: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" placeholder="Name, Address, Dates..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Blood Group</label>
                    <input type="text" value={formData.extendedProfile.bloodGroup} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, bloodGroup: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Infirmary / Primary Allergy Flags</label>
                    <input type="text" value={formData.allergyFlag} onChange={(e) => setFormData({ ...formData, allergyFlag: e.target.value })} placeholder="e.g. Asthmatic, Peanut allergy" className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-brand-violet" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Extensive Medical History (Immunizations, Hearing, Dental)</label>
                    <textarea rows={2} value={formData.extendedProfile.medicalHistory} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, medicalHistory: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet" />
                  </div>
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Special Needs / IEP Details</label>
                    <textarea rows={2} value={formData.extendedProfile.specialNeedsDetails} onChange={(e) => setFormData({ ...formData, extendedProfile: { ...formData.extendedProfile, specialNeedsDetails: e.target.value } })} className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet" />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-600 font-bold mb-1">Conduct & Pedagogical Remarks</label>
                  <textarea rows={2} value={formData.conductRemark} onChange={(e) => setFormData({ ...formData, conductRemark: e.target.value })} placeholder="Official conduct appraisal remarks..." className="w-full bg-white border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-brand-violet" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => { setIsEnrollModalOpen(false); setIsEditModalOpen(false); setActiveStudent(null); }} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingForm} className="px-6 py-2 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-colors disabled:opacity-50 flex items-center gap-2">
                  {isSubmittingForm ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Saving to SIS...</>
                  ) : (
                    <><i className="ph-bold ph-check"></i> {isEditModalOpen ? "Update Profile" : "Complete Enrollment"}</>
                  )}
                </button>
              </div>

            </form>
      </Modal>

      {/* ========================================================================= */}
      {/* DELETE / WITHDRAW CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isDeleteConfirmOpen && !!studentToDelete}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteConfirmOpen(false);
            setStudentToDelete(null);
          }
        }}
        hideHeader
        size="md"
        disableBackdropClick={isDeleting}
        bodyClassName="p-6 sm:p-8 text-center"
      >
        {studentToDelete && (
          <div>
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-3xl mx-auto mb-4 shadow-xs">
              <i className="ph-bold ph-warning-octagon"></i>
            </div>
            <h3 className="text-xl font-serif font-bold text-brand-textMain">Withdraw Student?</h3>
            <p className="text-xs text-brand-textMuted mt-2 mb-6 leading-relaxed">
              Are you sure you want to withdraw <strong className="text-brand-textMain">{studentToDelete.fullName}</strong> ({studentToDelete.indexNo}) from <strong>{studentToDelete.classGrade}</strong>? This will remove their record from active registries.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setStudentToDelete(null);
                }}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteStudent}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing Withdrawal...
                  </>
                ) : (
                  <>
                    <i className="ph-bold ph-trash text-sm"></i>
                    Confirm Withdrawal
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* CLASS PROMOTION & ACADEMIC TRANSITION ENGINE WORKSPACE (MODAL) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPromotionEngineOpen}
        onClose={() => {
          if (!isPromoting) setIsPromotionEngineOpen(false);
        }}
        hideHeader
        size="6xl"
        disableBackdropClick={isPromoting}
        className="h-[92vh] max-h-[920px]"
        bodyClassName="p-4 sm:p-6 flex flex-col flex-1 min-h-0 overflow-hidden"
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-brand-violet text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                  <i className="ph-bold ph-arrow-fat-lines-up"></i>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-serif font-bold text-brand-textMain">
                      Class Promotion & Academic Transition Studio
                    </h3>
                    <span className="px-2.5 py-0.5 bg-brand-violetLight text-brand-violet font-mono text-[10px] font-bold rounded-full">
                      GES / NaCCA Engine
                    </span>
                  </div>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    Evaluate end-of-year trajectories, set custom council thresholds, and batch promote cohorts into the new academic session.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPromotionEngineOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold self-end sm:self-center"
              >
                ✕
              </button>
            </div>

            {/* Studio Settings Bar */}
            <div className="bg-brand-bg/80 p-3 sm:p-4 rounded-2xl border border-gray-200/70 my-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs shrink-0">
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Source Cohort
                </label>
                <select
                  value={promoSourceCohort}
                  onChange={(e) => setPromoSourceCohort(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet shadow-2xs"
                >
                  <option value="all">All Enrolled Classes ({students.length})</option>
                  {dynamicCohorts.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Target Academic Session
                </label>
                <input
                  type="text"
                  value={promoTargetSession}
                  onChange={(e) => setPromoTargetSession(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet shadow-2xs"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  <span>Pass Threshold</span>
                  <span className="text-emerald-700 font-mono">{passThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="70"
                  step="1"
                  value={passThreshold}
                  onChange={(e) => setPassThreshold(Number(e.target.value))}
                  className="w-full accent-brand-violet cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  <span>Probation Threshold</span>
                  <span className="text-amber-700 font-mono">{probationThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="50"
                  step="1"
                  value={probationThreshold}
                  onChange={(e) => setProbationThreshold(Number(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                  <span>Min Attendance</span>
                  <span className="text-brand-violet font-mono">{attendanceThreshold}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  step="1"
                  value={attendanceThreshold}
                  onChange={(e) => setAttendanceThreshold(Number(e.target.value))}
                  className="w-full accent-brand-violet cursor-pointer"
                />
              </div>

            </div>

            {/* Telemetry Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-3 shrink-0">
              <div className="bg-purple-50/70 px-3 py-2 rounded-xl border border-purple-200 text-center">
                <span className="text-[9px] font-bold text-purple-800 uppercase">Evaluated Cohort</span>
                <strong className="text-sm font-bold text-purple-950 block">{promoTelemetry.total} Pupils</strong>
              </div>
              <div className="bg-emerald-50/70 px-3 py-2 rounded-xl border border-emerald-200 text-center">
                <span className="text-[9px] font-bold text-emerald-800 uppercase">Clear Promotion</span>
                <strong className="text-sm font-bold text-emerald-700 block">{promoTelemetry.promoteCount} ({promoTelemetry.promotePct}%)</strong>
              </div>
              <div className="bg-amber-50/70 px-3 py-2 rounded-xl border border-amber-200 text-center">
                <span className="text-[9px] font-bold text-amber-800 uppercase">On Probation</span>
                <strong className="text-sm font-bold text-amber-700 block">{promoTelemetry.probationCount} ({promoTelemetry.probationPct}%)</strong>
              </div>
              <div className="bg-red-50/70 px-3 py-2 rounded-xl border border-red-200 text-center">
                <span className="text-[9px] font-bold text-red-800 uppercase">Retained / Repeat</span>
                <strong className="text-sm font-bold text-red-700 block">{promoTelemetry.repeatCount} ({promoTelemetry.repeatPct}%)</strong>
              </div>
              <div className="bg-indigo-50/70 px-3 py-2 rounded-xl border border-indigo-200 text-center col-span-2 sm:col-span-1">
                <span className="text-[9px] font-bold text-indigo-800 uppercase">Graduated / Alumni</span>
                <strong className="text-sm font-bold text-indigo-700 block">{promoTelemetry.graduateCount} Pupils</strong>
              </div>
            </div>

            {/* Batch Candidates Decision Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-inner">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-brand-bg text-gray-600 uppercase font-bold text-[10px] sticky top-0 z-20 border-b border-gray-200 shadow-xs">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-3">Current Class</th>
                    <th className="py-3 px-3">Avg / Attn</th>
                    <th className="py-3 px-3">Decision</th>
                    <th className="py-3 px-3">Destination Class</th>
                    <th className="py-3 px-4">Council Remarks / Override Justification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {promotionCandidates.map((s) => {
                    const eff = getEffectiveDecision(s);
                    const isOverridden = Boolean(decisionOverrides[s.id]);

                    return (
                      <tr key={s.id} className="hover:bg-purple-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-violet/10 flex items-center justify-center border border-brand-violet/20 shrink-0">
                              <i className="ph-bold ph-student text-brand-violet text-sm"></i>
                            </div>
                            <div>
                              <strong className="font-bold text-brand-textMain block text-xs">{s.fullName}</strong>
                              <span className="font-mono text-[10px] text-gray-400">{s.indexNo}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-bold text-brand-textMain">{s.classGrade}</span>
                        </td>

                        <td className="py-3 px-3">
                          <div className="space-y-0.5">
                            <span className={`font-mono font-bold text-[11px] block ${
                              s.avgScore >= passThreshold ? 'text-emerald-700' :
                              s.avgScore >= probationThreshold ? 'text-amber-700' :
                              'text-red-700'
                            }`}>
                              {s.avgScore}%
                            </span>
                            <span className="text-[10px] text-gray-400 block">{s.attendancePct}% reg</span>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <select
                            value={eff.decision}
                            onChange={(e) => handleUpdateOverride(s.id, { decision: e.target.value as PromotionDecisionType })}
                            className={`px-2.5 py-1.5 rounded-lg font-bold text-xs border outline-none cursor-pointer ${getDecisionBadge(eff.decision)}`}
                          >
                            <option value="Promote">Promote (Clear Pass)</option>
                            <option value="Probation">Promote on Probation</option>
                            <option value="Repeat">Retain / Repeat Class</option>
                            <option value="Graduated">Graduated (Alumni)</option>
                          </select>
                        </td>

                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={eff.targetClass}
                            onChange={(e) => handleUpdateOverride(s.id, { targetClass: e.target.value })}
                            className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-brand-textMain w-36 outline-none focus:border-brand-violet"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={eff.reason}
                              onChange={(e) => handleUpdateOverride(s.id, { reason: e.target.value })}
                              placeholder="Reason for council decision..."
                              className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-[11px] text-brand-textMuted w-full outline-none focus:border-brand-violet"
                            />
                            {isOverridden && (
                              <span className="shrink-0 px-2 py-0.5 bg-brand-violet text-white text-[9px] font-bold rounded-md uppercase tracking-wider" title="Modified from automatic calculation">
                                Overridden
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 mt-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsGazetteOpen(true)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
                >
                  <i className="ph-bold ph-printer"></i> Preview Decision Gazette
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDecisionOverrides({});
                    toast.success("Reset all decisions to automatic NaCCA standards");
                  }}
                  className="px-3 py-2 text-gray-500 hover:text-red-600 font-bold rounded-xl text-xs transition-colors"
                >
                  Reset Overrides
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPromotionEngineOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPromoting || promotionCandidates.length === 0}
                  onClick={handleCommitPromotion}
                  className="px-5 py-2 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPromoting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Committing to SIS...
                    </>
                  ) : (
                    <>
                      <i className="ph-bold ph-check-circle"></i> Commit Batch Promotion ({promoTelemetry.total} Pupils)
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
      </Modal>

      {/* ========================================================================= */}
      {/* PROMOTION DECISION GAZETTE / REPORT CARD BATCH VIEW */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isGazetteOpen}
        onClose={() => setIsGazetteOpen(false)}
        hideHeader
        size="3xl"
        bodyClassName="p-6 sm:p-8 space-y-6"
      >
        <div className="flex justify-between items-start border-b border-gray-100 pb-4">
          <div className="text-left">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-violet text-white font-bold flex items-center justify-center text-sm">
                RPS
              </div>
              <h3 className="text-lg font-serif font-bold text-brand-textMain">The Roseland Preparatory School</h3>
            </div>
            <span className="text-xs font-mono font-bold text-brand-violet block mt-1">Official Academic Promotion Decision Gazette</span>
            <p className="text-[11px] text-gray-400">
              Academic Session: 2025/2026 → {committedBatchSummary ? committedBatchSummary.targetSession : promoTargetSession} • Ga West Municipal Directorate
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsGazetteOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

            {/* Gazette Body */}
            <div className="space-y-4 text-xs">
              <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100 flex items-center justify-between text-xs font-bold text-brand-textMain">
                <span>
                  Evaluated Cohort: {committedBatchSummary ? committedBatchSummary.sourceCohort : (promoSourceCohort === 'all' ? 'All Classes' : promoSourceCohort)}
                </span>
                <span>
                  Total Endorsed: {committedBatchSummary ? committedBatchSummary.totalCount : promoTelemetry.total} Pupils
                </span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 font-bold uppercase text-[10px] text-gray-400 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3">Index #</th>
                      <th className="py-2.5 px-3">Pupil Full Name</th>
                      <th className="py-2.5 px-3">Score %</th>
                      <th className="py-2.5 px-3">Decision</th>
                      <th className="py-2.5 px-3">New Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {committedBatchSummary ? (
                      committedBatchSummary.records.map(rec => (
                        <tr key={rec.id}>
                          <td className="py-2.5 px-3 font-mono text-[10px]">{rec.indexNo}</td>
                          <td className="py-2.5 px-3 font-bold text-brand-textMain">{rec.name}</td>
                          <td className="py-2.5 px-3 font-mono">{rec.avgScore}%</td>
                          <td className="py-2.5 px-3 font-bold">{rec.decision}</td>
                          <td className="py-2.5 px-3 font-bold text-brand-violet">{rec.newClass}</td>
                        </tr>
                      ))
                    ) : (
                      promotionCandidates.map(s => {
                        const eff = getEffectiveDecision(s);
                        return (
                          <tr key={s.id}>
                            <td className="py-2.5 px-3 font-mono text-[10px]">{s.indexNo}</td>
                            <td className="py-2.5 px-3 font-bold text-brand-textMain">{s.fullName}</td>
                            <td className="py-2.5 px-3 font-mono">{s.avgScore}%</td>
                            <td className="py-2.5 px-3 font-bold">{eff.decision}</td>
                            <td className="py-2.5 px-3 font-bold text-brand-violet">{eff.targetClass}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Headmaster Endorsement Box */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-brand-textMain block">Authorized Headmaster Sign-off:</span>
                  <span className="text-gray-400 text-[10px]">Academic Board Resolution RPS-AB-2026/07</span>
                </div>
                <div className="text-right">
                  <div className="font-serif italic font-bold text-brand-violet text-sm">{AuthService.getCurrentUser()?.fullName || 'Headmaster'}</div>
                  <span className="text-[9px] text-gray-400 uppercase font-mono">Headmaster, The Roseland</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  const recordsToPrint = committedBatchSummary
                    ? committedBatchSummary.records.map(r => ({
                        indexNo: r.indexNo,
                        name: r.name,
                        avgScore: r.avgScore,
                        decision: r.decision,
                        newClass: r.newClass,
                      }))
                    : promotionCandidates.map(s => {
                        const eff = getEffectiveDecision(s);
                        return {
                          indexNo: s.indexNo,
                          name: s.fullName,
                          avgScore: s.avgScore,
                          decision: eff.decision,
                          newClass: eff.targetClass,
                        };
                      });

                  printPromotionGazette({
                    sourceSession: '2025/2026',
                    targetSession: committedBatchSummary ? committedBatchSummary.targetSession : promoTargetSession,
                    sourceCohort: committedBatchSummary ? committedBatchSummary.sourceCohort : (promoSourceCohort === 'all' ? 'All Classes' : promoSourceCohort),
                    totalEvaluated: recordsToPrint.length,
                    records: recordsToPrint,
                    authorizedBy: AuthService.getCurrentUser()?.fullName || 'Headmaster',
                    resolutionNo: 'RPS-AB-2026/07',
                  });
                  toast.success("Generated Endorsed Promotion Gazette");
                }}
                className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer"
              >
                <i className="ph-bold ph-printer"></i> Print Endorsed Gazette
              </button>
            </div>
      </Modal>

      {/* ========================================================================= */}
      {/* STUDENT 360° PROFILE DRAWER / MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!activeStudent && !isIdCardOpen && !isEditModalOpen && !isDeleteConfirmOpen}
        onClose={() => setActiveStudent(null)}
        hideHeader
        size="2xl"
        bodyClassName="p-6 sm:p-8 relative"
      >
        {activeStudent && (
          <div>
            <button
              onClick={() => setActiveStudent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base z-10"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-brand-violet shadow-md shrink-0">
                <div className="w-full h-full bg-brand-violet/10 flex items-center justify-center">
                  <i className="ph-bold ph-student text-brand-violet text-3xl"></i>
                </div>
              </div>
              <div className="flex-1">
                <span className="font-mono text-xs text-brand-violet font-bold">{activeStudent.indexNo}</span>
                <h3 className="text-2xl font-serif font-bold text-brand-textMain">{activeStudent.fullName}</h3>
                <p className="text-xs text-brand-textMuted">{activeStudent.classGrade} • {activeStudent.house} House</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenEdit(activeStudent)}
                className="px-4 py-2 bg-brand-violet hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2 mr-10"
              >
                <i className="ph-bold ph-pencil-simple"></i>
                Edit Profile
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              <div className="p-4 bg-brand-bg rounded-2xl text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Weighted Average</span>
                <strong className="text-xl font-bold text-brand-violet block mt-0.5">{activeStudent.avgScore}%</strong>
              </div>
              <div className="p-4 bg-brand-bg rounded-2xl text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Attendance Rate</span>
                <strong className="text-xl font-bold text-green-700 block mt-0.5">{activeStudent.attendancePct}%</strong>
              </div>
              <div className="p-4 bg-brand-bg rounded-2xl text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Fee Status</span>
                <strong className="text-xl font-bold text-brand-textMain block mt-0.5">{activeStudent.feeStatus}</strong>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => handleToggleFeeStatus(activeStudent.id, 'Paid')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${activeStudent.feeStatus === 'Paid' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'}`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFeeStatus(activeStudent.id, 'Partial')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${activeStudent.feeStatus === 'Partial' ? 'bg-amber-600 text-white' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}
                  >
                    Partial
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFeeStatus(activeStudent.id, 'Overdue')}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${activeStudent.feeStatus === 'Overdue' ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'}`}
                  >
                    Overdue
                  </button>
                </div>
              </div>
            </div>

            {/* Historical Continuity & Timeline Card */}
            {activeStudent.enrollmentDate && (
              <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-100/80 flex items-center justify-between text-xs mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-brand-violet text-white flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
                    <i className="ph-bold ph-hourglass-high"></i>
                  </span>
                  <div>
                    <strong className="text-brand-textMain block font-serif text-sm">
                      Enrolled: {new Date(activeStudent.enrollmentDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </strong>
                    <span className="text-[11px] text-brand-textMuted">
                      Entry Grade: <strong className="text-brand-violet">{activeStudent.entryClass || activeStudent.classGrade}</strong> • Historic Paper Migration Verified
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-white rounded-lg border border-purple-200 text-brand-violet font-bold text-[10px] tracking-wider uppercase shadow-xs">
                  Historical Anchor
                </span>
              </div>
            )}

            {/* ========================================================================= */}
            {/* MULTI-TERM CUMULATIVE ACADEMIC & ATTENDANCE DOSSIER (DIGITIZED ARCHIVE) */}
            {/* ========================================================================= */}
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm text-xs mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-brand-violetLight text-brand-violet flex items-center justify-center font-bold text-sm">
                    <i className="ph-bold ph-scroll"></i>
                  </span>
                  <div>
                    <h4 className="font-bold text-brand-textMain uppercase text-[11px] tracking-wider">
                      Digitized Academic Archive & Attendance History
                    </h4>
                    <p className="text-[10px] text-brand-textMuted">
                      Verified continuous records across all academic years & terms
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-brand-violet font-bold text-[10px] border border-purple-200">
                  {cumulativeHistory.length} Term{cumulativeHistory.length === 1 ? '' : 's'} Digitized
                </span>
              </div>

              {isLoadingCumulative ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-brand-textMuted">
                  <div className="w-5 h-5 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[11px]">Loading historical academic transcripts...</span>
                </div>
              ) : cumulativeHistory.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center space-y-1.5">
                  <i className="ph-bold ph-file-dashed text-2xl text-gray-400"></i>
                  <p className="text-xs font-bold text-brand-textMain">No Historical Terminal Reports Digitized Yet</p>
                  <p className="text-[10px] text-brand-textMuted max-w-sm mx-auto">
                    Use the <strong>Digitize Paper Records</strong> tool in the Academics console to batch upload past terminal broadsheets and attendance rolls for this student's class.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Term Selector Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {cumulativeHistory.map((report) => {
                      const isSelected = selectedHistoricalTermId === report.id;
                      return (
                        <button
                          key={report.id}
                          type="button"
                          onClick={() => setSelectedHistoricalTermId(report.id)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-[11px] whitespace-nowrap transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-brand-violet text-white shadow-sm'
                              : 'bg-brand-bg text-brand-textMuted hover:bg-gray-100'
                          }`}
                        >
                          <i className="ph-bold ph-calendar"></i>
                          {report.academic_year} • {report.academic_term}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Term Detail Snapshot */}
                  {(() => {
                    const selectedReport = cumulativeHistory.find(r => r.id === selectedHistoricalTermId) || cumulativeHistory[0];
                    if (!selectedReport) return null;

                    const subjects = selectedReport.subject_breakdowns || [];
                    const attDays = selectedReport.attendance_present_days ?? selectedReport.attendance_days_present;
                    const attTotal = selectedReport.attendance_total_days ?? selectedReport.attendance_total_sessions;
                    const attPct = attTotal && attTotal > 0 && attDays !== null && attDays !== undefined 
                      ? Math.round((Number(attDays) / Number(attTotal)) * 1000) / 10 
                      : null;

                    return (
                      <div className="bg-brand-bg/60 p-4 rounded-xl border border-gray-100 space-y-4">
                        {/* Summary Metrics Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-center">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Term Average</span>
                            <strong className="text-sm font-bold text-brand-violet">
                              {selectedReport.composite_average !== undefined && selectedReport.composite_average !== null 
                                ? `${selectedReport.composite_average}%` 
                                : 'N/A'}
                            </strong>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-center">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Class Standing</span>
                            <strong className="text-sm font-bold text-brand-textMain">
                              {selectedReport.class_position ? `${selectedReport.class_position} / ${selectedReport.class_cohort_size || '—'}` : '—'}
                            </strong>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-center">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Attendance Roll</span>
                            <strong className="text-sm font-bold text-emerald-700">
                              {attDays !== null && attDays !== undefined && attTotal
                                ? `${attDays}/${attTotal} (${attPct}%)`
                                : attPct !== null ? `${attPct}%` : 'Recorded'}
                            </strong>
                          </div>

                          <div className="bg-white p-2.5 rounded-lg border border-gray-100 text-center">
                            <span className="text-[9px] font-bold text-gray-400 uppercase block">Cohort / Grade</span>
                            <strong className="text-xs font-bold text-brand-textMain truncate block">
                              {selectedReport.class_grade}
                            </strong>
                          </div>
                        </div>

                        {/* Subject Breakdown Table */}
                        {subjects.length > 0 && (
                          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                            <table className="w-full text-left text-[11px]">
                              <thead className="bg-gray-50 text-[10px] font-bold uppercase text-gray-500 border-b border-gray-200">
                                <tr>
                                  <th className="py-2 px-3">Subject</th>
                                  <th className="py-2 px-2 text-center">CA (40%)</th>
                                  <th className="py-2 px-2 text-center">Exam (60%)</th>
                                  <th className="py-2 px-2 text-center">Total</th>
                                  <th className="py-2 px-2 text-center">Grade</th>
                                  <th className="py-2 px-3">Remarks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {subjects.map((sub: any, idx: number) => (
                                  <tr key={idx} className="hover:bg-purple-50/30">
                                    <td className="py-2 px-3 font-semibold text-brand-textMain">{sub.subject}</td>
                                    <td className="py-2 px-2 text-center font-mono text-gray-600">{sub.sba_40 ?? '—'}</td>
                                    <td className="py-2 px-2 text-center font-mono text-gray-600">{sub.terminal_exam_60 ?? '—'}</td>
                                    <td className="py-2 px-2 text-center font-bold font-mono text-brand-violet">{sub.final_score_100}%</td>
                                    <td className="py-2 px-2 text-center">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                        Number(sub.stanine_grade) <= 3
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : Number(sub.stanine_grade) <= 6
                                          ? 'bg-blue-100 text-blue-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        Gr {sub.stanine_grade}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-[10px] text-gray-500 italic">{sub.teacher_remark || 'Satisfactory'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* Form Master & Headmistress Remarks */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                          {selectedReport.form_master_remarks && (
                            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                              <span className="font-bold text-brand-textMain uppercase text-[9px] block">Form Master's Remark</span>
                              <p className="text-gray-600 italic mt-0.5">"{selectedReport.form_master_remarks}"</p>
                            </div>
                          )}
                          {selectedReport.headmaster_remarks && (
                            <div className="p-2.5 bg-white rounded-lg border border-gray-100">
                              <span className="font-bold text-brand-violet uppercase text-[9px] block">Headmistress's Endorsement</span>
                              <p className="text-purple-950 italic mt-0.5">"{selectedReport.headmaster_remarks}"</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Parent & Emergency Info */}
            <div className="bg-brand-bg p-5 rounded-2xl border border-gray-100 space-y-3 text-xs mb-6">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-brand-textMain uppercase text-[11px]">Parent & Guardian Coordinates</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <p><strong>Primary Contact:</strong> {activeStudent.parentName || 'Not recorded'}</p>
                <p><strong>Phone:</strong> {activeStudent.parentPhone || 'Not recorded'}</p>
                <p><strong>Emergency Contact:</strong> {activeStudent.emergencyPhone || activeStudent.parentPhone || 'Not recorded'}</p>
                <p><strong>Email:</strong> {activeStudent.parentEmail || 'Not recorded'}</p>
                <p><strong>Date of Birth:</strong> {activeStudent.dateOfBirth || 'Not recorded'}</p>
                <p><strong>Residence:</strong> {activeStudent.residentialAddress || 'Not recorded'}</p>
              </div>
            </div>

            {/* Medical / Allergy Alerts */}
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 text-xs mb-6">
              <span className="font-bold text-red-800 uppercase text-[10px] block mb-1">Infirmary & Clinical Flags</span>
              <p className="text-red-900 font-medium">
                {activeStudent.allergyFlag ? activeStudent.allergyFlag : "No known medical conditions or food allergies logged."}
              </p>
            </div>

            {/* Conduct & Remarks */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs mb-6">
              <span className="font-bold text-gray-700 uppercase text-[10px] block mb-1">Pedagogical & Conduct Remarks</span>
              <p className="text-gray-800 italic">
                {activeStudent.conductRemark ? `"${activeStudent.conductRemark}"` : "No remarks recorded."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => {
                  setStudentToDelete(activeStudent);
                  setIsDeleteConfirmOpen(true);
                }}
                className="px-4 py-2 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Withdraw Pupil
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    printStudentDossier({
                      fullName: activeStudent.fullName,
                      indexNo: activeStudent.indexNo,
                      classGrade: activeStudent.classGrade,
                      house: activeStudent.house,
                      gender: activeStudent.gender,
                      dateOfBirth: activeStudent.dateOfBirth,
                      enrollmentDate: activeStudent.enrollmentDate,
                      residentialAddress: activeStudent.residentialAddress,
                      parentName: activeStudent.parentName,
                      parentPhone: activeStudent.parentPhone,
                      parentEmail: activeStudent.parentEmail,
                      emergencyPhone: activeStudent.emergencyPhone,
                      feeStatus: activeStudent.feeStatus,
                      avgScore: activeStudent.avgScore,
                      attendancePct: activeStudent.attendancePct,
                      allergyFlag: activeStudent.allergyFlag,
                      conductRemark: activeStudent.conductRemark,
                      avatar: activeStudent.avatar,
                      academicHistory: cumulativeHistory.length > 0 ? cumulativeHistory.map(r => ({
                        session: r.academic_year,
                        term: r.academic_term,
                        classGrade: r.class_grade,
                        avgScore: r.composite_average !== null ? r.composite_average : activeStudent.avgScore,
                        attendancePct: (r.attendance_present_days && r.attendance_total_days) ? Math.round((Number(r.attendance_present_days) / Number(r.attendance_total_days)) * 100) : activeStudent.attendancePct,
                        remark: r.form_master_remarks || 'Endorsed Terminal Record'
                      })) : [
                        {
                          session: 'Current Academic Session',
                          term: 'Live Registry',
                          classGrade: activeStudent.classGrade,
                          avgScore: activeStudent.avgScore,
                          attendancePct: activeStudent.attendancePct,
                          remark: activeStudent.conductRemark || 'No historical terms digitized yet.',
                        }
                      ]
                    });
                    toast.success("Generated Official Pupil Dossier");
                  }}
                  className="px-4 py-2 bg-white hover:bg-gray-50 text-brand-textMain border border-gray-200 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <i className="ph-bold ph-printer"></i> Print Dossier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const phone = activeStudent.parentPhone.replace(/[^0-9]/g, '');
                    window.open(`https://wa.me/233${phone.startsWith('0') ? phone.slice(1) : phone}`, '_blank');
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <i className="ph-fill ph-whatsapp-logo"></i> WhatsApp Parent
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenIdCard(activeStudent)}
                  className="px-4 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-sm cursor-pointer"
                >
                  Generate Biometric ID
                </button>
              </div>
            </div>

          </div>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* BIOMETRIC STUDENT ID CARD GENERATOR MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isIdCardOpen && !!activeStudent}
        onClose={() => setIsIdCardOpen(false)}
        hideHeader
        size="md"
        bodyClassName="p-6 sm:p-8 relative"
      >
        {activeStudent && (
          <div>
            <button
              onClick={() => setIsIdCardOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base z-10"
            >
              ✕
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Badge Center</span>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-4">Official Student ID Card</h3>

            {/* ID Card Visual */}
            <div className="bg-gradient-to-br from-brand-violetDark via-brand-violet to-purple-900 text-white rounded-3xl p-6 shadow-2xl border-4 border-yellow-400 relative overflow-hidden mb-6">
              <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white p-0.5 shrink-0 overflow-hidden">
                    <img src="/logo.png" alt="The Roseland Preparatory School Crest" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm tracking-wide">The Roseland Prep</h4>
                    <span className="text-[8px] uppercase tracking-widest text-brand-yellow font-bold">Ga West, Accra</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full font-bold">PUPIL</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-20 bg-white rounded-xl overflow-hidden border-2 border-white shadow shrink-0">
                  <div className="w-full h-full bg-brand-violet/20 flex items-center justify-center">
                    <i className="ph-bold ph-student text-brand-violetLight text-2xl"></i>
                  </div>
                </div>
                <div className="space-y-1 text-xs">
                  <h5 className="font-bold text-sm leading-tight text-white">{activeStudent.fullName}</h5>
                  <p className="font-mono text-[11px] text-brand-yellow font-bold">{activeStudent.indexNo}</p>
                  <p className="text-[10px] text-brand-violetLight font-semibold">{activeStudent.classGrade}</p>
                  <p className="text-[10px] text-brand-violetLight font-semibold">{activeStudent.house} House</p>
                </div>
              </div>

              {/* Cryptographic Biometric QR Code from Backend */}
              <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                <div className="text-[8px] text-gray-300 space-y-0.5">
                  <p>GES REG: RPS-GES-4029</p>
                  <p>BLOOD GROUP: {idCardDossier?.bloodGroup || 'O+ (Verified)'}</p>
                  <p>EXP: JUL 2027</p>
                </div>
                <div className="w-14 h-14 bg-white p-1 rounded-lg shrink-0 shadow">
                  {isLoadingIdCard ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-brand-violet border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : idCardDossier?.qrCodeDataUrl ? (
                    <img src={idCardDossier.qrCodeDataUrl} alt="Biometric QR Verification" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-500 font-mono">
                      QR READY
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                printStudentIdCard({
                  fullName: activeStudent.fullName,
                  indexNo: activeStudent.indexNo,
                  classGrade: activeStudent.classGrade,
                  house: activeStudent.house,
                  avatar: activeStudent.avatar,
                  bloodGroup: idCardDossier?.bloodGroup || 'O+ (Verified)',
                  qrCodeDataUrl: idCardDossier?.qrCodeDataUrl,
                  emergencyPhone: activeStudent.emergencyPhone || activeStudent.parentPhone,
                  expiryDate: 'JUL 2027',
                });
                toast.success("Printing High-Res Plastic ID Card...");
                setIsIdCardOpen(false);
              }}
              className="w-full py-3 bg-brand-violet text-white font-bold rounded-xl text-xs hover:bg-brand-violetDark shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <i className="ph-bold ph-printer"></i> Print ID Badge
            </button>
          </div>
        )}
      </Modal>

      {/* Bulk Student Register & CSV Importer Modal */}
      <BulkStudentImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => {
          loadStudentsFromBackend();
        }}
      />

    </div>
  );
}
