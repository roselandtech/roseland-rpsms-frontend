"use client";

import { useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { useClasses } from '@/hooks/useClasses';

interface BulkStudentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export interface ParsedStudentRow {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  otherNames: string;
  gender: 'Male' | 'Female';
  dob: string;
  className: string;
  house: 'Red' | 'Yellow' | 'Green' | 'Blue';
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  emergencyPhone: string;
  allergies: string;
  isValid: boolean;
  errors: string[];
}

/**
 * Normalizes multi-format dates (YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YYYY)
 */
function normalizeDateString(raw: string, defaultDate: string = ''): string {
  if (!raw || !raw.trim()) return defaultDate;
  const clean = raw.trim().replace(/^["']|["']$/g, '');

  // 1. Check if standard ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  const slashParts = clean.split(/[\/\-\.]/);
  if (slashParts.length === 3) {
    let p1 = parseInt(slashParts[0], 10);
    let p2 = parseInt(slashParts[1], 10);
    let p3 = parseInt(slashParts[2], 10);

    // If 4 digits at start: YYYY-MM-DD
    if (slashParts[0].length === 4) {
      const m = String(p2).padStart(2, '0');
      const d = String(p3).padStart(2, '0');
      return `${p1}-${m}-${d}`;
    }

    // If 4 digits at end: DD/MM/YYYY or MM/DD/YYYY
    if (slashParts[2].length === 4) {
      const year = p3;
      let month = p2;
      let day = p1;

      // Handle cases where p1 > 12 -> definitely Day
      if (p1 > 12) {
        day = p1;
        month = p2;
      } else if (p2 > 12) {
        day = p2;
        month = p1;
      }

      const mStr = String(month).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      return `${year}-${mStr}-${dStr}`;
    }
  }

  // 3. Try standard JS Date parsing fallback
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return defaultDate;
}

export default function BulkStudentImportModal({
  isOpen,
  onClose,
  onSuccess,
}: BulkStudentImportModalProps) {
  const { classes: registeredClasses } = useClasses();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [rows, setRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoGenerateInvoice, setAutoGenerateInvoice] = useState(true);
  const [autoProvisionParent, setAutoProvisionParent] = useState(true);
  const [importSummary, setImportSummary] = useState<{ total: number; classesCount: Record<string, number> } | null>(null);

  const validClassesList = useMemo(() => {
    return registeredClasses.map(c => c.name.trim());
  }, [registeredClasses]);

  if (!isOpen) return null;

  // ---------------------------------------------------------------------------
  // 1. DYNAMIC HISTORICAL CSV TEMPLATE GENERATOR
  // ---------------------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const sampleClass1 = validClassesList.length > 0 ? validClassesList[0] : 'Basic 4';
    const sampleClass2 = validClassesList.length > 1 ? validClassesList[1] : (validClassesList[0] || 'Basic 1');
    const headers = [
      'admission_number',
      'first_name',
      'last_name',
      'other_names',
      'gender',
      'date_of_birth',
      'current_class',
      'house',
      'parent_name',
      'parent_phone',
      'parent_email',
      'emergency_phone',
      'residential_address',
      'medical_allergies'
    ].join(',');

    const sampleRow1 = [
      'ROS/2021/042',
      'Kofi',
      'Mensah',
      'Kwame',
      'Male',
      '2015-05-14',
      `"${sampleClass1}"`,
      'Blue',
      'Grace Mensah',
      '0241234567',
      'grace.mensah@gmail.com',
      '0509876543',
      '"Pokuase ACP Estates, Block C"',
      'None'
    ].join(',');

    const sampleRow2 = [
      'ROS/2018/019',
      'Ama',
      'Osei',
      'Akoto',
      'Female',
      '2012-11-20',
      `"${sampleClass2}"`,
      'Yellow',
      'Dr. Patrick Osei',
      '0558765432',
      'patrick.osei@hospital.org',
      '0244112233',
      '"Kwabenya Hills, House 14"',
      '"Mild Asthma"'
    ].join(',');

    const csvContent = "data:text/csv;charset=utf-8," + [headers, sampleRow1, sampleRow2].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `roseland_student_onboarding_template_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Downloaded official Roseland Student Onboarding template!");
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

    // Parse header row
    const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase());
    
    const admIdx = headers.findIndex(h => h.includes('adm') || h.includes('index') || h.includes('roll_no'));
    const fnIdx = headers.findIndex(h => h.includes('first') || h === 'firstname');
    const lnIdx = headers.findIndex(h => h.includes('last') || h.includes('surname') || h === 'lastname');
    const onIdx = headers.findIndex(h => h.includes('other') || h.includes('middle'));
    const genIdx = headers.findIndex(h => h.includes('gender') || h.includes('sex'));
    const dobIdx = headers.findIndex(h => h.includes('dob') || h.includes('birth') || h.includes('date_of_birth'));
    const enrIdx = headers.findIndex(h => h.includes('enroll') || h.includes('admission_date') || h.includes('joined'));
    const entryClsIdx = headers.findIndex(h => h.includes('entry_class') || h.includes('initial_class') || h.includes('admitted_to'));
    const clsIdx = headers.findIndex(h => h.includes('current_class') || h.includes('class') || h.includes('grade') || h.includes('stream'));
    const houseIdx = headers.findIndex(h => h.includes('house'));
    const pnIdx = headers.findIndex(h => h.includes('parent_name') || h.includes('guardian_name') || h.includes('parent'));
    const ppIdx = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('contact'));
    const peIdx = headers.findIndex(h => h.includes('email'));
    const addrIdx = headers.findIndex(h => h.includes('address') || h.includes('location') || h.includes('residence'));
    const epIdx = headers.findIndex(h => h.includes('emergency'));
    const allergyIdx = headers.findIndex(h => h.includes('allergy') || h.includes('medical') || h.includes('health'));

    const parsed: ParsedStudentRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;

      // Split respecting quotes
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

      const admissionNo = getVal(admIdx);
      const firstName = getVal(fnIdx);
      const lastName = getVal(lnIdx);
      const otherNames = getVal(onIdx);
      let rawGender = getVal(genIdx).toLowerCase();
      let gender: 'Male' | 'Female' = rawGender.startsWith('f') ? 'Female' : 'Male';

      const rawDob = getVal(dobIdx);
      const dob = normalizeDateString(rawDob, '');

      let className = getVal(clsIdx);

      let rawHouse = getVal(houseIdx).toLowerCase();
      let house: 'Red' | 'Yellow' | 'Green' | 'Blue' = 'Blue';
      if (rawHouse.includes('red') || rawHouse.includes('ruby')) house = 'Red';
      else if (rawHouse.includes('yellow') || rawHouse.includes('gold')) house = 'Yellow';
      else if (rawHouse.includes('green') || rawHouse.includes('emerald')) house = 'Green';
      else if (rawHouse.includes('blue') || rawHouse.includes('sapphire')) house = 'Blue';

      const parentName = getVal(pnIdx);
      let parentPhone = getVal(ppIdx);
      const parentEmail = getVal(peIdx);
      const address = getVal(addrIdx) || 'Pokuase ACP, Accra';
      const emergencyPhone = getVal(epIdx) || parentPhone;
      const allergies = getVal(allergyIdx) || 'None';

      // Validation Rules
      const errors: string[] = [];
      if (!firstName) errors.push("Missing first name");
      if (!lastName) errors.push("Missing surname");
      if (!parentName) errors.push("Missing guardian name");

      // Phone validation
      const cleanPhone = parentPhone.replace(/[^0-9+]/g, '');
      if (!cleanPhone || cleanPhone.length < 9) {
        errors.push("Invalid parent phone (need 10 digits)");
      } else {
        parentPhone = cleanPhone;
      }

      // Class validation
      if (!className) {
        errors.push("Current class is required");
      } else if (validClassesList.length > 0) {
        const normalizeClass = (s: string) => s.toLowerCase().replace(/\s+/g, '');
        const matched = validClassesList.find(c => normalizeClass(c) === normalizeClass(className));
        if (matched) {
          className = matched;
        } else {
          errors.push(`Class "${className}" not found in School Registry`);
        }
      }

      parsed.push({
        id: `row-${i}-${Date.now()}`,
        admissionNo,
        firstName,
        lastName,
        otherNames,
        gender,
        dob,
        className,
        house,
        parentName,
        parentPhone,
        parentEmail,
        address,
        emergencyPhone,
        allergies,
        isValid: errors.length === 0,
        errors
      });
    }

    if (parsed.length === 0) {
      toast.error("No valid student rows could be parsed from the file.");
      return;
    }

    setRows(parsed);
    setStep('preview');
    toast.success(`Successfully parsed ${parsed.length} historical student records!`);
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
  // 3. INLINE ROW EDITING & RE-VALIDATION
  // ---------------------------------------------------------------------------
  const handleUpdateRow = (id: string, field: keyof ParsedStudentRow, val: any) => {
    setRows(prev => prev.map(row => {
      if (row.id !== id) return row;
      const updated = { ...row, [field]: val };

      // Re-validate row
      const errors: string[] = [];
      if (!updated.firstName.trim()) errors.push("Missing first name");
      if (!updated.lastName.trim()) errors.push("Missing surname");
      if (!updated.parentName.trim()) errors.push("Missing guardian name");
      if (!updated.parentPhone.trim() || updated.parentPhone.replace(/[^0-9]/g, '').length < 9) {
        errors.push("Invalid phone (need 10 digits)");
      }
      if (!updated.className.trim()) {
        errors.push("Current class is required");
      } else if (validClassesList.length > 0) {
        const normalizeClass = (s: string) => s.toLowerCase().replace(/\s+/g, '');
        const matched = validClassesList.find(c => normalizeClass(c) === normalizeClass(updated.className.trim()));
        if (!matched) {
          errors.push(`Class "${updated.className}" not in Registry`);
        }
      }

      return {
        ...updated,
        isValid: errors.length === 0,
        errors
      };
    }));
  };

  const handleDeleteRow = (id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
    toast.success("Row removed from import queue");
  };

  const validCount = rows.filter(r => r.isValid).length;
  const invalidCount = rows.length - validCount;

  // ---------------------------------------------------------------------------
  // 4. BATCH INGESTION SUBMISSION
  // ---------------------------------------------------------------------------
  const handleExecuteImport = async () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) {
      toast.error("There are no valid student rows to import. Please resolve the errors first.");
      return;
    }

    setIsProcessing(true);
    const toastId = toast.loading(`Ingesting ${validRows.length} historical scholars into Roseland SIS...`);

    try {
      const payload = validRows.map((r) => {
        const fullNm = `${r.firstName.trim()} ${r.otherNames ? r.otherNames.trim() + ' ' : ''}${r.lastName.trim()}`.trim();
        return {
          admission_no: r.admissionNo.trim() || undefined,
          admissionNo: r.admissionNo.trim() || undefined,
          firstName: r.firstName.trim(),
          lastName: r.lastName.trim(),
          otherNames: r.otherNames.trim() || undefined,
          fullName: fullNm,
          full_name: fullNm,
          gender: r.gender,
          dateOfBirth: r.dob,
          date_of_birth: r.dob,
          dob: r.dob,
          enrollment_date: undefined,
          enrollmentDate: undefined,
          entry_class: r.className.trim(),
          entryClass: r.className.trim(),
          classGrade: r.className.trim(),
          class_grade: r.className.trim(),
          className: r.className.trim(),
          house: r.house,
          parentName: r.parentName.trim(),
          parent_name: r.parentName.trim(),
          parentPhone: r.parentPhone.trim(),
          parent_phone: r.parentPhone.trim(),
          parentEmail: r.parentEmail.trim() || undefined,
          parent_email: r.parentEmail.trim() || undefined,
          residentialAddress: r.address.trim(),
          residential_address: r.address.trim(),
          address: r.address.trim(),
          emergencyPhone: r.emergencyPhone.trim() || r.parentPhone.trim(),
          emergency_phone: r.emergencyPhone.trim() || r.parentPhone.trim(),
          allergy_flag: r.allergies.trim() || undefined,
          autoGenerateInvoice,
          autoProvisionParent
        };
      });

      await RoselandApi.sis.bulkEnrollStudents(payload);

      // Tally class breakdown
      const classesCount: Record<string, number> = {};
      validRows.forEach(r => {
        classesCount[r.className] = (classesCount[r.className] || 0) + 1;
      });

      setImportSummary({
        total: validRows.length,
        classesCount
      });

      toast.dismiss(toastId);
      toast.success(`Successfully enrolled ${validRows.length} scholars into the live system with historical continuity!`);
      setStep('success');
      onSuccess();
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(err?.message || "Failed to complete bulk ingestion. Please try again.");
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
              Legacy Paper-to-Digital Ingestion Engine
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              ✓ Historical Timeline Fidelity
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-brand-textMain">
            Historical Student Register & CSV Onboarding
          </h2>
          <p className="text-xs text-brand-textMuted mt-0.5">
            Ingest active student cohorts from physical paper registers while preserving their exact original enrollment dates, entry classes, and past terminal averages.
          </p>
        </div>

        {/* Content Body based on step */}
        <div className="flex-1 overflow-y-auto pr-1">
          
          {/* ================================================================= */}
          {/* STEP 1: UPLOAD & TEMPLATE DOWNLOAD */}
          {/* ================================================================= */}
          {step === 'upload' && (
            <div className="space-y-6">
              
              {/* Instructions Banner */}
              <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-100/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-serif font-bold text-sm text-brand-textMain flex items-center gap-2">
                    <i className="ph-bold ph-file-csv text-brand-violet text-lg"></i>
                    Step 1: Download Official Roseland Historical Template
                  </h4>
                  <p className="text-xs text-brand-textMuted max-w-xl">
                    Pre-populated with historical enrollment date anchors, entry class progressions, and past attendance summary columns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer"
                >
                  <i className="ph-bold ph-download-simple"></i> Download Historical Template (.CSV)
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 hover:border-brand-violet rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all bg-brand-bg hover:bg-purple-50/30 group space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-gray-200 flex items-center justify-center mx-auto text-brand-violet group-hover:scale-110 transition-transform">
                  <i className="ph-bold ph-cloud-arrow-up text-3xl"></i>
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-brand-textMain">
                    Click to browse or drag & drop your completed student spreadsheet
                  </h3>
                  <p className="text-xs text-brand-textMuted mt-1">
                    Supports standard CSV files transcribed from physical class cumulative folders and paper roll-books.
                  </p>
                </div>
                <span className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-mono text-gray-500">
                  Auto-detects: YYYY-MM-DD, DD/MM/YYYY, and historical date formats
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Quality & Safeguard Notice */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1 text-xs">
                  <strong className="text-brand-textMain flex items-center gap-1.5">
                    <i className="ph-bold ph-calendar text-brand-violet"></i> True Historical Date
                  </strong>
                  <p className="text-brand-textMuted text-[11px]">
                    Preserves original admission dates (e.g. 2021) so timelines and report cards reflect true seniority.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1 text-xs">
                  <strong className="text-brand-textMain flex items-center gap-1.5">
                    <i className="ph-bold ph-users-three text-brand-violet"></i> Family Deduplication
                  </strong>
                  <p className="text-brand-textMuted text-[11px]">
                    Siblings sharing the same parent phone are automatically unified under one parent login.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-brand-bg border border-gray-100 space-y-1 text-xs">
                  <strong className="text-brand-textMain flex items-center gap-1.5">
                    <i className="ph-bold ph-shield-check text-brand-violet"></i> Pre-Flight Inspector
                  </strong>
                  <p className="text-brand-textMuted text-[11px]">
                    Review and inline-edit any errors directly in your browser before committing to PostgreSQL.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 2: INTERACTIVE PREVIEW & INLINE STAGING TABLE */}
          {/* ================================================================= */}
          {step === 'preview' && (
            <div className="space-y-4">
              
              {/* Summary Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-brand-bg p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
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
                      setStep('upload');
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-brand-textMain font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Upload Different File
                  </button>
                </div>
              </div>

              {/* Interactive Staging Table */}
              <div className="border border-gray-200 rounded-2xl max-h-[46vh] overflow-auto">
                <table className="w-full min-w-[1200px] text-left text-xs border-collapse">
                  <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10 border-b border-gray-200 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Adm / Index No</th>
                      <th className="p-3">Full Name & Gender</th>
                      <th className="p-3">DOB</th>
                      <th className="p-3">Class Grade</th>
                      <th className="p-3">House</th>
                      <th className="p-3">Parent & Contact</th>
                      <th className="p-3">Address & Allergies</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {rows.map((row) => (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-purple-50/20 transition-colors ${!row.isValid ? 'bg-red-50/40' : ''}`}
                      >
                        {/* Status / Errors */}
                        <td className="p-3 align-top whitespace-nowrap">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">
                              ✓ Ready
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                                ⚠️ Fix Error
                              </span>
                              <div className="text-[10px] text-red-600 font-medium">
                                {row.errors.map((e, idx) => (
                                  <div key={idx}>• {e}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Admission No */}
                        <td className="p-3 align-top">
                          <input
                            type="text"
                            placeholder="Auto-gen"
                            value={row.admissionNo}
                            onChange={(e) => handleUpdateRow(row.id, 'admissionNo', e.target.value)}
                            className="w-28 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-brand-violet outline-none focus:border-brand-violet"
                          />
                        </td>

                        {/* Names */}
                        <td className="p-3 align-top">
                          <div className="space-y-1">
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="First Name"
                                value={row.firstName}
                                onChange={(e) => handleUpdateRow(row.id, 'firstName', e.target.value)}
                                className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                              />
                              <input
                                type="text"
                                placeholder="Surname"
                                value={row.lastName}
                                onChange={(e) => handleUpdateRow(row.id, 'lastName', e.target.value)}
                                className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                              />
                            </div>
                            <select
                              value={row.gender}
                              onChange={(e: any) => handleUpdateRow(row.id, 'gender', e.target.value)}
                              className="bg-brand-bg border border-gray-200 rounded-lg px-1.5 py-0.5 text-[11px] font-semibold text-gray-700 outline-none"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                            </select>
                          </div>
                        </td>

                        {/* DOB */}
                        <td className="p-3 align-top whitespace-nowrap">
                          <input
                            type="date"
                            value={row.dob}
                            onChange={(e) => handleUpdateRow(row.id, 'dob', e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-brand-textMain outline-none focus:border-brand-violet"
                          />
                        </td>

                        {/* Class Grade */}
                        <td className="p-3 align-top">
                          <div className="space-y-1">
                            <select
                              value={row.className}
                              onChange={(e) => handleUpdateRow(row.id, 'className', e.target.value)}
                              className="w-28 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-brand-textMain outline-none focus:border-brand-violet"
                            >
                              <option value="" disabled>Select Class</option>
                              {validClassesList.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                              {!validClassesList.includes(row.className) && row.className && (
                                <option value={row.className}>{row.className} (Invalid)</option>
                              )}
                            </select>
                          </div>
                        </td>

                        {/* House */}
                        <td className="p-3 align-top">
                          <select
                            value={row.house}
                            onChange={(e: any) => handleUpdateRow(row.id, 'house', e.target.value)}
                            className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-700 outline-none"
                          >
                            <option value="Red">Red</option>
                            <option value="Yellow">Yellow</option>
                            <option value="Green">Green</option>
                            <option value="Blue">Blue</option>
                          </select>
                        </td>

                        {/* Parent Name & Phone */}
                        <td className="p-3 align-top">
                          <div className="space-y-1">
                            <input
                              type="text"
                              placeholder="Guardian Name"
                              value={row.parentName}
                              onChange={(e) => handleUpdateRow(row.id, 'parentName', e.target.value)}
                              className="w-32 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-brand-textMain outline-none focus:border-brand-violet"
                            />
                            <input
                              type="text"
                              placeholder="Parent Phone"
                              value={row.parentPhone}
                              onChange={(e) => handleUpdateRow(row.id, 'parentPhone', e.target.value)}
                              className="w-32 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono font-bold text-brand-textMain outline-none focus:border-brand-violet"
                            />
                          </div>
                        </td>

                        {/* Address & Medical */}
                        <td className="p-3 align-top">
                          <div className="space-y-1">
                            <input
                              type="text"
                              placeholder="Address"
                              value={row.address}
                              onChange={(e) => handleUpdateRow(row.id, 'address', e.target.value)}
                              className="w-32 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs text-brand-textMain outline-none focus:border-brand-violet"
                            />
                            <input
                              type="text"
                              placeholder="Allergies / Med"
                              value={row.allergies}
                              onChange={(e) => handleUpdateRow(row.id, 'allergies', e.target.value)}
                              className="w-32 bg-white border border-gray-200 rounded-lg px-2 py-1 text-[11px] text-gray-500 outline-none focus:border-brand-violet"
                            />
                          </div>
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

              {/* Automatic Provisioning Options */}
              <div className="bg-brand-bg p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-brand-textMain">
                    <input
                      type="checkbox"
                      checked={autoProvisionParent}
                      onChange={(e) => setAutoProvisionParent(e.target.checked)}
                      className="rounded accent-brand-violet w-4 h-4"
                    />
                    Auto-Provision Linked Parent Accounts
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-brand-textMain">
                    <input
                      type="checkbox"
                      checked={autoGenerateInvoice}
                      onChange={(e) => setAutoGenerateInvoice(e.target.checked)}
                      className="rounded accent-brand-violet w-4 h-4"
                    />
                    Generate Current Term Tuition Fee Invoices
                  </label>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={validCount === 0 || isProcessing}
                    onClick={handleExecuteImport}
                    className="flex-1 sm:flex-none px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <i className="ph-bold ph-check"></i>
                    {isProcessing ? 'Ingesting...' : `Ingest ${validCount} Scholars into Live SIS`}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ================================================================= */}
          {/* STEP 3: SUCCESS CONFIRMATION */}
          {/* ================================================================= */}
          {step === 'success' && importSummary && (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-sm">
                <i className="ph-bold ph-check-circle"></i>
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-serif font-bold text-brand-textMain">
                  Historical Onboarding Completed!
                </h3>
                <p className="text-xs text-brand-textMuted max-w-md mx-auto">
                  Successfully enrolled <strong>{importSummary.total} scholars</strong> into Roselyn with full historical continuity.
                </p>
              </div>

              {/* Class Breakdown Grid */}
              <div className="max-w-md mx-auto bg-brand-bg p-4 rounded-2xl border border-gray-100 text-xs space-y-2">
                <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] block">
                  Cohort Ingestion Summary
                </span>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {Object.entries(importSummary.classesCount).map(([cls, count]) => (
                    <div key={cls} className="flex justify-between p-2 bg-white rounded-xl border border-gray-100">
                      <span className="font-bold text-brand-textMain">{cls}:</span>
                      <span className="font-mono text-brand-violet font-bold">{count} Enrolled</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleModalClose}
                className="px-8 py-3 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
              >
                <i className="ph-bold ph-arrow-right"></i> View Updated Student Directory
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
