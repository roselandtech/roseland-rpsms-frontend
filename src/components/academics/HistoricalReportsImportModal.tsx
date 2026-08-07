"use client";

import { useState, useRef, useMemo, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { useClasses } from '@/hooks/useClasses';

interface HistoricalReportsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultClass?: string;
  defaultYear?: string;
  defaultTerm?: string;
  availableClasses?: string[] | Array<{ id?: string; name: string }>;
}

export interface ParsedHistoricalRow {
  id: string;
  indexNo: string;
  studentName: string;
  daysPresent: number;
  totalDays: number;
  overallAvg: number;
  classPosition: string;
  conductRating: string;
  formMasterRemark: string;
  headmasterRemark: string;
  subjectScores: Record<string, number>;
  isMatchedInSis: boolean;
  isValid: boolean;
  errors: string[];
}

const ACADEMIC_YEARS = [
  '2025/2026',
  '2024/2025',
  '2023/2024',
  '2022/2023',
  '2021/2022',
  '2020/2021'
];

const ACADEMIC_TERMS = ['Term 1', 'Term 2', 'Term 3'];

const CORE_SUBJECT_KEYS = [
  { key: 'mathematics', label: 'Mathematics' },
  { key: 'english_language', label: 'English Language' },
  { key: 'integrated_science', label: 'Integrated Science' },
  { key: 'social_studies', label: 'Social Studies' },
  { key: 'ict', label: 'Computing / ICT' },
  { key: 'rme', label: 'R.M.E.' },
  { key: 'creative_arts', label: 'Creative Arts' },
  { key: 'ghanaian_language', label: 'Ghanaian Language (Twi/Ga)' },
  { key: 'french', label: 'French' }
];

export default function HistoricalReportsImportModal({
  isOpen,
  onClose,
  onSuccess,
  defaultClass = '',
  defaultYear = '2023/2024',
  defaultTerm = 'Term 1',
  availableClasses
}: HistoricalReportsImportModalProps) {
  const { classes: registeredClasses, isLoading: isLoadingClasses } = useClasses();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute live classes from database (props or useClasses hook)
  const classOptions = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addClass = (raw?: string) => {
      if (!raw) return;
      const trimmed = raw.trim();
      if (trimmed && !seen.has(trimmed.toLowerCase())) {
        seen.add(trimmed.toLowerCase());
        list.push(trimmed);
      }
    };

    if (availableClasses && availableClasses.length > 0) {
      availableClasses.forEach((c) => {
        const name = typeof c === 'string' ? c : c?.name;
        addClass(name);
      });
    }

    if (registeredClasses && registeredClasses.length > 0) {
      registeredClasses.forEach((c) => {
        addClass(c?.name);
      });
    }

    return list;
  }, [availableClasses, registeredClasses]);

  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedTerm, setSelectedTerm] = useState(defaultTerm);
  const [selectedClass, setSelectedClass] = useState(defaultClass);
  const [termSchoolDays, setTermSchoolDays] = useState<number>(68);

  const [step, setStep] = useState<'config' | 'preview' | 'success'>('config');
  const [rows, setRows] = useState<ParsedHistoricalRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingRoster, setIsFetchingRoster] = useState(false);
  const [liveSisStudents, setLiveSisStudents] = useState<Array<{ index_no: string; full_name: string }>>([]);
  const [importSummary, setImportSummary] = useState<{
    year: string;
    term: string;
    classGrade: string;
    totalReports: number;
    totalScores: number;
  } | null>(null);

  // Sync default values on open
  useEffect(() => {
    if (isOpen) {
      if (defaultClass && classOptions.includes(defaultClass)) {
        setSelectedClass(defaultClass);
      } else if (classOptions.length > 0) {
        setSelectedClass((prev) => (prev && classOptions.includes(prev) ? prev : classOptions[0]));
      }
      if (defaultYear) setSelectedYear(defaultYear);
      if (defaultTerm) setSelectedTerm(defaultTerm);
      setStep('config');
      setRows([]);
    }
  }, [isOpen, defaultClass, defaultYear, defaultTerm, classOptions]);

  // Fetch live SIS students for the selected class to verify index numbers
  useEffect(() => {
    if (!isOpen || !selectedClass) return;

    let isMounted = true;
    const fetchClassStudents = async () => {
      try {
        const res = await RoselandApi.academic.getRosterTemplate(selectedClass, selectedYear, selectedTerm);
        if (isMounted && res?.roster) {
          setLiveSisStudents(res.roster);
        }
      } catch {
        // Silently fail if offline or empty
      }
    };

    fetchClassStudents();
    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedClass, selectedYear, selectedTerm]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // 1. SMART PRE-POPULATED HISTORICAL CSV TEMPLATE GENERATOR
  // ---------------------------------------------------------------------------
  const handleDownloadTemplate = async () => {
    setIsFetchingRoster(true);
    const toastId = toast.loading(`Preparing Smart Roster template for ${selectedClass}...`);

    try {
      let roster = liveSisStudents;
      if (!roster || roster.length === 0) {
        const res = await RoselandApi.academic.getRosterTemplate(selectedClass, selectedYear, selectedTerm);
        roster = res?.roster || [];
      }

      const headers = [
        'index_number',
        'student_name',
        'days_present',
        'total_school_days',
        'mathematics',
        'english_language',
        'integrated_science',
        'social_studies',
        'ict',
        'rme',
        'creative_arts',
        'ghanaian_language',
        'french',
        'form_master_remark',
        'headmaster_remark'
      ].join(',');

      let csvRows: string[] = [];

      if (roster.length > 0) {
        // Pre-fill every enrolled student with their official index number
        csvRows = roster.map((s, idx) => {
          const samplePres = Math.min(termSchoolDays, 60 + (idx % 8));
          return [
            `"${s.index_no}"`,
            `"${s.student_name}"`,
            samplePres,
            termSchoolDays,
            80 + (idx % 15),
            78 + (idx % 18),
            82 + (idx % 14),
            76 + (idx % 20),
            88 + (idx % 10),
            84 + (idx % 12),
            85,
            80,
            75,
            '"Consistently attentive and studious."',
            '"Promoted in good standing."'
          ].join(',');
        });
      } else {
        // Fallback sample students if none enrolled in this class yet
        csvRows = [
          [
            'ROS/2021/042',
            'Kofi Mensah Kwame',
            66,
            termSchoolDays,
            85,
            82,
            88,
            80,
            90,
            84,
            86,
            82,
            78,
            '"Exceptional performance throughout the term."',
            '"Outstanding scholar. Keep it up!"'
          ].join(','),
          [
            'ROS/2018/019',
            'Ama Osei Akoto',
            67,
            termSchoolDays,
            90,
            88,
            92,
            85,
            94,
            89,
            91,
            86,
            84,
            '"Diligent and proactive class leader."',
            '"Commendable dedication to academic excellence."'
          ].join(',')
        ];
      }

      const csvContent = "data:text/csv;charset=utf-8," + [headers, ...csvRows].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      const cleanFileName = `roseland_historical_scores_${selectedClass.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedYear.replace('/', '-')}_${selectedTerm.replace(' ', '')}.csv`;
      link.setAttribute('download', cleanFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss(toastId);
      toast.success(`Downloaded official Roseland Smart Roster template with ${roster.length > 0 ? roster.length + ' students pre-filled' : 'sample format'}!`);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Failed to generate template.");
    } finally {
      setIsFetchingRoster(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. CSV PARSER & PRE-FLIGHT VALIDATION ENGINE
  // ---------------------------------------------------------------------------
  const parseCSVText = (text: string) => {
    const lines = text.split(/\r\n|\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      toast.error("The selected file is empty or missing data rows.");
      return;
    }

    const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase());

    const idxIndex = headers.findIndex(h => h.includes('index') || h.includes('adm') || h.includes('id') || h === 'student_id');
    const nameIndex = headers.findIndex(h => h.includes('name') || h.includes('student'));
    const presIndex = headers.findIndex(h => h.includes('present') || h.includes('days_present') || h.includes('att_days'));
    const totalDaysIndex = headers.findIndex(h => h.includes('total') || h.includes('school_days') || h.includes('max_days'));
    const fmIndex = headers.findIndex(h => h.includes('form_master') || h.includes('teacher_remark') || h.includes('remark'));
    const hmIndex = headers.findIndex(h => h.includes('headmaster') || h.includes('hm_remark') || h.includes('principal'));

    // Dynamic subject columns matcher
    const subjectColumnIndices: Record<string, number> = {};
    CORE_SUBJECT_KEYS.forEach(sub => {
      const foundIdx = headers.findIndex(h => {
        const clean = h.replace(/[^a-z0-9]/g, '');
        if (sub.key === 'mathematics' && (clean.includes('math') || clean.includes('numeracy'))) return true;
        if (sub.key === 'english_language' && (clean.includes('english') || clean.includes('literacy'))) return true;
        if (sub.key === 'integrated_science' && (clean.includes('science') || clean.includes('naturalscience'))) return true;
        if (sub.key === 'social_studies' && (clean.includes('social') || clean.includes('ourworld'))) return true;
        if (sub.key === 'ict' && (clean.includes('ict') || clean.includes('computing'))) return true;
        if (sub.key === 'rme' && (clean.includes('rme') || clean.includes('religious'))) return true;
        if (sub.key === 'creative_arts' && (clean.includes('creative') || clean.includes('art'))) return true;
        if (sub.key === 'ghanaian_language' && (clean.includes('ghana') || clean.includes('twi') || clean.includes('ga') || clean.includes('fante'))) return true;
        if (sub.key === 'french' && clean.includes('french')) return true;
        return false;
      });
      if (foundIdx >= 0) {
        subjectColumnIndices[sub.label] = foundIdx;
      }
    });

    const knownSisIndexMap = new Map<string, string>();
    liveSisStudents.forEach(s => {
      knownSisIndexMap.set(s.index_no.trim().toLowerCase(), s.full_name);
    });

    const parsed: ParsedHistoricalRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      const values: string[] = [];
      let cur = '';
      let insideQuote = false;
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          insideQuote = !insideQuote;
        } else if (char === ',' && !insideQuote) {
          values.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      values.push(cur.trim());

      const getVal = (idx: number) => (idx >= 0 && idx < values.length ? values[idx].replace(/^["']|["']$/g, '').trim() : '');

      let indexNo = getVal(idxIndex);
      let studentName = getVal(nameIndex);
      const rawPres = parseInt(getVal(presIndex), 10);
      const rawTot = parseInt(getVal(totalDaysIndex), 10);

      const daysPresent = !isNaN(rawPres) ? rawPres : termSchoolDays;
      const totalDays = !isNaN(rawTot) ? rawTot : termSchoolDays;

      const formMasterRemark = getVal(fmIndex) || "Commendable academic effort throughout the term.";
      const headmasterRemark = getVal(hmIndex) || "Good standing. Keep up the high standard.";

      // Extract subject scores
      const subjectScores: Record<string, number> = {};
      const scoreValues: number[] = [];

      Object.entries(subjectColumnIndices).forEach(([label, colIdx]) => {
        const rawScore = parseFloat(getVal(colIdx));
        if (!isNaN(rawScore) && rawScore >= 0 && rawScore <= 100) {
          subjectScores[label] = rawScore;
          scoreValues.push(rawScore);
        }
      });

      // Compute average
      const overallAvg = scoreValues.length > 0
        ? Math.round((scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length) * 10) / 10
        : 75.0;

      // Verification & Matching
      const errors: string[] = [];
      if (!indexNo && !studentName) {
        errors.push("Missing both Index Number and Student Name");
      }

      // Check if student exists in SIS
      let isMatched = false;
      if (indexNo) {
        const matchedName = knownSisIndexMap.get(indexNo.toLowerCase());
        if (matchedName) {
          isMatched = true;
          if (!studentName) studentName = matchedName;
        }
      }

      if (daysPresent > totalDays) {
        errors.push(`Days present (${daysPresent}) cannot exceed total days (${totalDays})`);
      }

      parsed.push({
        id: `hist-row-${i}-${Date.now()}`,
        indexNo: indexNo || `PENDING-${i}`,
        studentName: studentName || 'Unnamed Scholar',
        daysPresent,
        totalDays,
        overallAvg,
        classPosition: `Recorded`,
        conductRating: overallAvg >= 75 ? 'Exemplary' : 'Good',
        formMasterRemark,
        headmasterRemark,
        subjectScores,
        isMatchedInSis: isMatched,
        isValid: errors.length === 0,
        errors
      });
    }

    if (parsed.length === 0) {
      toast.error("Could not parse any rows from the file.");
      return;
    }

    setRows(parsed);
    setStep('preview');
    toast.success(`Successfully parsed ${parsed.length} historical terminal records for ${selectedClass}!`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        parseCSVText(content);
      }
    };
    reader.readAsText(file);
  };

  // ---------------------------------------------------------------------------
  // 3. INLINE EDITING
  // ---------------------------------------------------------------------------
  const handleUpdateRow = (id: string, field: keyof ParsedHistoricalRow, val: any) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: val };

      const errors: string[] = [];
      if (!updated.indexNo.trim()) errors.push("Index No is required");
      if (!updated.studentName.trim()) errors.push("Student name is required");
      if (updated.daysPresent > updated.totalDays) {
        errors.push(`Days present (${updated.daysPresent}) exceeds total days (${updated.totalDays})`);
      }

      return {
        ...updated,
        isValid: errors.length === 0,
        errors
      };
    }));
  };

  const handleUpdateSubjectScore = (rowId: string, subjectName: string, val: number) => {
    setRows(prev => prev.map(row => {
      if (row.id !== rowId) return row;
      const updatedScores = { ...row.subjectScores, [subjectName]: val };
      const vals = Object.values(updatedScores).filter(v => !isNaN(v) && v >= 0);
      const newAvg = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : row.overallAvg;

      return {
        ...row,
        subjectScores: updatedScores,
        overallAvg: newAvg
      };
    }));
  };

  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    toast.success("Row removed from staging queue");
  };

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.length - validCount;

  // ---------------------------------------------------------------------------
  // 4. BATCH INGESTION SUBMISSION
  // ---------------------------------------------------------------------------
  const handleExecuteImport = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error("There are no valid records to import. Please resolve the errors first.");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(`Archiving ${validRows.length} historical terminal records for ${selectedClass} (${selectedYear} ${selectedTerm})...`);

    try {
      const payload = {
        academic_year: selectedYear,
        academic_term: selectedTerm,
        class_grade: selectedClass,
        records: validRows.map(r => ({
          student_index_no: r.indexNo.trim(),
          student_name: r.studentName.trim(),
          days_present: r.daysPresent,
          total_attendance: r.totalDays,
          overall_avg: r.overallAvg,
          class_position: r.classPosition || 'Recorded',
          conduct_rating: r.conductRating || 'Exemplary',
          attitude_rating: 'Consistent & Studious',
          interest_rating: 'Active in Class',
          form_master_remark: r.formMasterRemark.trim(),
          headmaster_remark: r.headmasterRemark.trim(),
          subject_scores: r.subjectScores
        }))
      };

      const res = await RoselandApi.academic.bulkImportHistoricalReports(payload);

      setImportSummary({
        year: selectedYear,
        term: selectedTerm,
        classGrade: selectedClass,
        totalReports: res?.reportsIngested || validRows.length,
        totalScores: res?.scoreEntriesIngested || 0
      });

      toast.dismiss(toastId);
      toast.success(res?.message || `Successfully archived historical terminal reports!`);
      setStep('success');
      onSuccess();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Failed to commit historical records. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleModalClose = () => {
    if (step === 'success') {
      onSuccess();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-6xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative space-y-6 max-h-[94vh] flex flex-col">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center font-bold text-base transition-colors cursor-pointer"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="border-b border-gray-100 pb-4 shrink-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold text-brand-violet uppercase tracking-wider bg-brand-violetLight px-2.5 py-0.5 rounded-md">
              Academic Multi-Term Archive Hub
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              ✓ 3-Term Granular Ledger
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-textMain">
            Historical Terminal Report Cards & Attendance Digitizer
          </h2>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Digitize and archive physical terminal report sheets, continuous assessment scores (SBA), and attendance records across all previous academic years.
          </p>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto pr-1">
          
          {/* ================================================================= */}
          {/* STEP 1: COHORT SELECTION & TEMPLATE DOWNLOAD */}
          {/* ================================================================= */}
          {step === 'config' && (
            <div className="space-y-6">
              
              {/* Cohort Configuration Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-brand-bg border border-gray-100">
                
                {/* Academic Year */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-textMain flex items-center gap-1.5">
                    <i className="ph-bold ph-calendar text-brand-violet"></i> Academic Year
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {ACADEMIC_YEARS.map(y => (
                      <option key={y} value={y}>{y} Academic Year</option>
                    ))}
                  </select>
                </div>

                {/* Term */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-textMain flex items-center gap-1.5">
                    <i className="ph-bold ph-clock-counter-clockwise text-brand-violet"></i> Academic Term
                  </label>
                  <select
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  >
                    {ACADEMIC_TERMS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Class / Cohort */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-textMain flex items-center gap-1.5">
                    <i className="ph-bold ph-chalkboard text-brand-violet"></i> Class / Cohort
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    disabled={isLoadingClasses && classOptions.length === 0}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet disabled:bg-gray-50 disabled:text-gray-400"
                  >
                    {classOptions.length === 0 ? (
                      <option value="" disabled>
                        {isLoadingClasses ? 'Loading classes from database...' : 'No registered classes in database'}
                      </option>
                    ) : (
                      classOptions.map((cName) => (
                        <option key={cName} value={cName}>
                          {cName}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Term Total School Days */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-textMain flex items-center gap-1.5">
                    <i className="ph-bold ph-check-square text-brand-violet"></i> Term School Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={termSchoolDays}
                    onChange={(e) => setTermSchoolDays(parseInt(e.target.value, 10) || 68)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                  />
                </div>

              </div>

              {/* Template Banner */}
              <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm text-brand-textMain flex items-center gap-2">
                    <i className="ph-bold ph-file-csv text-brand-violet text-lg"></i>
                    Step 1: Download Smart Pre-Populated Roster CSV
                  </h4>
                  <p className="text-xs text-brand-textMuted max-w-xl">
                    Pre-fills all active students enrolled in <strong>{selectedClass}</strong> with their official Index Numbers. You only need to type in the physical attendance days and subject scores.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isFetchingRoster}
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <i className="ph-bold ph-download-simple text-sm"></i>
                  {isFetchingRoster ? 'Generating...' : `Download ${selectedClass} Template`}
                </button>
              </div>

              {/* Dropzone */}
              <div className="space-y-2">
                <h4 className="font-serif font-bold text-sm text-brand-textMain flex items-center gap-2">
                  <i className="ph-bold ph-upload-simple text-brand-violet text-lg"></i>
                  Step 2: Upload Completed CSV / Physical Sheet Transcription
                </h4>
                
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-purple-200 hover:border-brand-violet bg-brand-bg hover:bg-purple-50/30 rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-purple-100 flex items-center justify-center text-brand-violet group-hover:scale-110 transition-transform">
                    <i className="ph-bold ph-file-arrow-up text-2xl"></i>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-brand-textMain">
                      Click to upload completed Historical CSV
                    </p>
                    <p className="text-xs text-brand-textMuted">
                      Standard CSV exported from Excel or transcribed from paper broadsheets
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: PRE-FLIGHT VERIFICATION GRID */}
          {/* ================================================================= */}
          {step === 'preview' && (
            <div className="space-y-4">
              
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-bg p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-white rounded-xl border border-gray-200 font-bold text-xs text-brand-textMain">
                    Target: <strong>{selectedClass} ({selectedYear} {selectedTerm})</strong>
                  </span>
                  <span className="px-3 py-1 bg-white rounded-xl border border-gray-200 font-bold text-xs text-brand-textMain">
                    Total Parsed: <strong>{rows.length}</strong>
                  </span>
                  <span className="px-3 py-1 bg-green-50 text-green-700 rounded-xl border border-green-200 font-bold text-xs flex items-center gap-1">
                    ✓ Valid: <strong>{validCount}</strong>
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-3 py-1 bg-red-50 text-red-700 rounded-xl border border-red-200 font-bold text-xs flex items-center gap-1">
                      ⚠️ Needs Attention: <strong>{invalidCount}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRows([]);
                      setStep('config');
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-brand-textMain font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Change Parameters / Upload Different File
                  </button>
                </div>
              </div>

              {/* Interactive Staging Table */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden max-h-[46vh] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 border-b border-gray-200 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Index No</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Attendance (Days / Total)</th>
                      <th className="p-3">Maths</th>
                      <th className="p-3">English</th>
                      <th className="p-3">Science</th>
                      <th className="p-3">Social</th>
                      <th className="p-3">ICT</th>
                      <th className="p-3">Computed Avg</th>
                      <th className="p-3">Teacher Remark</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row) => (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-purple-50/20 transition-colors ${!row.isValid ? 'bg-red-50/40' : ''}`}
                      >
                        {/* Status / Matched */}
                        <td className="p-3 align-top whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                              ✓ Ready
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                ⚠️ Error
                              </span>
                              <div className="text-[10px] text-red-600 font-medium">
                                {row.errors.map((e, idx) => (
                                  <div key={idx}>• {e}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Index No */}
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={row.indexNo}
                            onChange={(e) => handleUpdateRow(row.id, 'indexNo', e.target.value)}
                            className="w-28 bg-white border border-purple-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-brand-violet outline-none focus:border-brand-violet"
                          />
                        </td>

                        {/* Student Name */}
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={row.studentName}
                            onChange={(e) => handleUpdateRow(row.id, 'studentName', e.target.value)}
                            className="w-40 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                          />
                        </td>

                        {/* Attendance */}
                        <td className="p-3 align-top">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="120"
                              value={row.daysPresent}
                              onChange={(e) => handleUpdateRow(row.id, 'daysPresent', parseInt(e.target.value, 10) || 0)}
                              className="w-12 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs font-bold text-brand-textMain outline-none"
                            />
                            <span className="text-gray-400">/</span>
                            <input
                              type="number"
                              min="1"
                              max="120"
                              value={row.totalDays}
                              onChange={(e) => handleUpdateRow(row.id, 'totalDays', parseInt(e.target.value, 10) || termSchoolDays)}
                              className="w-12 bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-500 outline-none"
                            />
                          </div>
                        </td>

                        {/* Maths */}
                        <td className="p-3 align-top">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.subjectScores['Mathematics'] ?? 80}
                            onChange={(e) => handleUpdateSubjectScore(row.id, 'Mathematics', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-mono outline-none"
                          />
                        </td>

                        {/* English */}
                        <td className="p-3 align-top">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.subjectScores['English Language'] ?? 80}
                            onChange={(e) => handleUpdateSubjectScore(row.id, 'English Language', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-mono outline-none"
                          />
                        </td>

                        {/* Science */}
                        <td className="p-3 align-top">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.subjectScores['Integrated Science'] ?? 80}
                            onChange={(e) => handleUpdateSubjectScore(row.id, 'Integrated Science', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-mono outline-none"
                          />
                        </td>

                        {/* Social Studies */}
                        <td className="p-3 align-top">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.subjectScores['Social Studies'] ?? 80}
                            onChange={(e) => handleUpdateSubjectScore(row.id, 'Social Studies', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-mono outline-none"
                          />
                        </td>

                        {/* ICT */}
                        <td className="p-3 align-top">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.subjectScores['Computing / ICT'] ?? 85}
                            onChange={(e) => handleUpdateSubjectScore(row.id, 'Computing / ICT', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-xs font-mono outline-none"
                          />
                        </td>

                        {/* Computed Avg */}
                        <td className="p-3 align-top font-bold text-brand-violet whitespace-nowrap">
                          {row.overallAvg.toFixed(1)}%
                        </td>

                        {/* Remarks */}
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            value={row.formMasterRemark}
                            onChange={(e) => handleUpdateRow(row.id, 'formMasterRemark', e.target.value)}
                            className="w-48 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] text-gray-700 outline-none focus:border-brand-violet"
                          />
                        </td>

                        {/* Action */}
                        <td className="p-3 align-top text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors inline-flex items-center justify-center cursor-pointer"
                            title="Remove row"
                          >
                            <i className="ph-bold ph-trash text-sm"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: SUCCESS CONFIRMATION */}
          {/* ================================================================= */}
          {step === 'success' && importSummary && (
            <div className="py-8 text-center space-y-6 max-w-lg mx-auto">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl shadow-sm">
                ✓
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-serif font-bold text-brand-textMain">
                  Historical Records Archived!
                </h3>
                <p className="text-xs text-brand-textMuted">
                  Successfully ingested <strong>{importSummary.totalReports}</strong> terminal report cards and <strong>{importSummary.totalScores}</strong> subject score records for <strong>{importSummary.classGrade}</strong> ({importSummary.year} {importSummary.term}).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 text-xs text-brand-textMuted space-y-1">
                <p className="font-bold text-brand-textMain">Where can I see this data?</p>
                <p>
                  These records are now permanently attached to each student&apos;s <strong>Cumulative Profile Timeline</strong> and accessible in the <strong>Admin Academics & Report Cards</strong> vault.
                </p>
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                className="w-full py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Close & Return to Dashboard
              </button>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        {step === 'preview' && (
          <div className="border-t border-gray-100 pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
            <div className="text-xs text-brand-textMuted">
              Ready to commit: <strong>{validCount}</strong> of <strong>{rows.length}</strong> pupil dossiers.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('config')}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isProcessing || validCount === 0}
                onClick={handleExecuteImport}
                className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <i className="ph-bold ph-database text-base"></i>
                {isProcessing ? 'Committing to PostgreSQL...' : `Archive ${validCount} Terminal Records`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
