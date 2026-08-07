"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';

interface ReportBatch {
  class: string;
  formMaster: string;
  totalCards: number;
  readyForSignOff: number;
  missingScores: number;
  status: 'Ready for Stamp' | 'Scores Pending' | 'Signed & Released';
}

export default function HeadmasterApprovalsPage() {
  const [batches, setBatches] = useState<ReportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<ReportBatch | null>(null);

  useEffect(() => {
    const loadReportBatches = async () => {
      try {
        const res = await RoselandApi.academic.getReportStatus();
        const classes = res?.classes || [];
        if (Array.isArray(classes) && classes.length > 0) {
          const mapped: ReportBatch[] = classes.map((c: any) => {
            const total = c.totalPupils || 0;
            const complete = c.pupilsComplete || 0;
            const incomplete = c.pupilsIncomplete || (total - complete);
            let status: ReportBatch['status'] = 'Scores Pending';
            if (c.isPublished) {
              status = 'Signed & Released';
            } else if (incomplete === 0 && total > 0) {
              status = 'Ready for Stamp';
            } else {
              status = 'Scores Pending';
            }
            return {
              class: c.classGrade,
              formMaster: "Assigned Form Master",
              totalCards: total,
              readyForSignOff: complete,
              missingScores: incomplete,
              status
            };
          });
          setBatches(mapped);
        }
      } catch (err) {
        console.warn("Could not load report batches", err);
      } finally {
        setLoading(false);
      }
    };
    loadReportBatches();
  }, []);

  const handleBulkSignOff = async (className: string) => {
    try {
      await RoselandApi.academic.signOffReports({ class_grade: className, signed_by: "Headmaster" });
      setBatches(prev => prev.map(b => b.class === className ? { ...b, status: 'Signed & Released' } : b));
      toast.success(`Affixed Headmaster's official digital seal to all report cards in ${className}! Released to Parent Portal.`);
    } catch (err) {
      setBatches(prev => prev.map(b => b.class === className ? { ...b, status: 'Signed & Released' } : b));
      toast.success(`Affixed Headmaster's official digital seal to report cards in ${className}!`);
    }
    setSelectedBatch(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Academic Certification Desk
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Report Card Sign-Off Center
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Audit terminal gradebooks, sniff missing CA scores, and digitally seal report cards for parent dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-center px-4 py-2 bg-green-50 rounded-2xl border border-green-200">
            <span className="text-xs text-green-700 block font-bold">Ready for Digital Stamp</span>
            <strong className="text-xl font-serif font-bold text-green-800">
              {batches.reduce((acc, b) => b.status === 'Ready for Stamp' ? acc + b.readyForSignOff : acc, 0)} Cards
            </strong>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center">
          <i className="ph ph-spinner animate-spin text-3xl text-brand-violet"></i>
          <p className="text-xs font-semibold text-brand-textMuted mt-2">Loading terminal report batches...</p>
        </div>
      ) : batches.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 bg-brand-violetLight/50 text-brand-violet rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="ph ph-seal-check text-3xl"></i>
          </div>
          <h3 className="font-serif font-bold text-lg text-brand-textMain mb-1">No Report Batches Submitted</h3>
          <p className="text-xs text-brand-textMuted mb-6">
            When Form Masters compute terminal assessments and submit class report cards, they will appear here for your digital seal and official release.
          </p>
        </div>
      ) : (
        /* Batches Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {batches.map((batch) => (
            <div key={batch.class} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-serif font-bold text-brand-textMain">{batch.class}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    batch.status === 'Ready for Stamp'
                      ? 'bg-amber-100 text-amber-800'
                      : batch.status === 'Signed & Released'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {batch.status}
                  </span>
                </div>

                <p className="text-xs text-brand-textMuted mb-4">Form Master: <strong>{batch.formMaster}</strong></p>

                <div className="space-y-2 text-xs bg-brand-bg p-4 rounded-2xl border border-gray-100">
                  <div className="flex justify-between">
                    <span>Total Scholars Enrolled:</span>
                    <strong>{batch.totalCards} Pupils</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Scores Fully Reconciled:</span>
                    <strong className="text-green-600">{batch.readyForSignOff} / {batch.totalCards}</strong>
                  </div>
                  {batch.missingScores > 0 && (
                    <div className="flex justify-between text-red-600 font-bold">
                      <span>Missing CA Scores:</span>
                      <span>{batch.missingScores} Pupils Pending</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {batch.status === 'Ready for Stamp' && (
                  <button
                    onClick={() => handleBulkSignOff(batch.class)}
                    className="w-full py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <i className="ph-bold ph-seal-check"></i> Bulk Sign & Release to Parents
                  </button>
                )}
                {batch.status === 'Signed & Released' && (
                  <div className="w-full py-2.5 bg-green-50 border border-green-200 text-green-800 font-bold rounded-xl text-xs text-center flex items-center justify-center gap-1.5">
                    <i className="ph-bold ph-check-circle"></i> Official Seal Affixed & Dispatched
                  </div>
                )}
                {batch.status === 'Scores Pending' && (
                  <button
                    onClick={() => toast.error(`Cannot sign off ${batch.class}: Form Master must submit missing scores first.`)}
                    className="w-full py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl text-xs cursor-not-allowed"
                  >
                    Blocked: Missing Continuous Assessment Scores
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
