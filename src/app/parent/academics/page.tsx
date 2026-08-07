"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';

export default function ParentAcademics() {
  const [student, setStudent] = useState<any | null>(null);
  const [reportCards, setReportCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    RoselandApi.sis.getStudents().then((students) => {
      if (students && Array.isArray(students) && students.length > 0) {
        const s = students[0];
        setStudent(s);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const studentName = student?.fullName || student?.full_name || 'Scholar';
  const studentIndex = student?.indexNumber || student?.index_number || 'RPS-STUDENT';
  const studentClass = student?.classGrade || student?.class_grade || 'Classroom Stream';

  return (
    <div className="animate-fade-in space-y-6">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-brand-textMain">Academic Dossier & Terminal Reports</h2>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Official progress dossiers, SBA Continuous Assessment, and published terminal report cards for <strong>{studentName}</strong> ({studentClass}).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-serif font-bold text-brand-textMain text-base">End of Term Report Cards</h3>
          
          {reportCards.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 border border-gray-100 shadow-sm text-center">
              <i className="ph ph-file-dashed text-4xl text-gray-300 block mb-2"></i>
              <h4 className="font-bold text-sm text-brand-textMain">No Official Terminal Reports Published Yet</h4>
              <p className="text-xs text-brand-textMuted max-w-md mx-auto mt-1">
                Once the headmaster approves and signs the continuous assessment scores for {studentName}, encrypted report card PDFs will appear here for download.
              </p>
            </div>
          ) : (
            reportCards.map((rc, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-violetLight text-brand-violet flex items-center justify-center shrink-0">
                      <i className="ph-fill ph-file-pdf text-2xl"></i>
                    </div>
                    <div>
                      <h4 className="font-bold text-brand-textMain">{rc.term} Report Card</h4>
                      <p className="text-xs text-brand-textMuted mt-0.5">Academic Year: {rc.year || '2025/2026'} • {studentClass}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toast.success(`Preparing encrypted download for ${rc.term}`)}
                    className="w-full sm:w-auto px-4 py-2 bg-brand-violet text-white text-xs font-semibold rounded-xl hover:bg-brand-violetDark transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <i className="ph ph-download-simple"></i> Download PDF
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <h3 className="font-serif font-bold text-brand-textMain text-base mb-4">Academic Assessment Snapshot</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className="text-brand-textMain">Attendance Rate</span>
                <span className="text-brand-violet">Term Sync</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-brand-violet h-full rounded-full" style={{ width: '100%' }}></div>
              </div>
              <p className="text-[10px] text-brand-textMuted mt-1">Roll call marked regularly</p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold text-brand-textMuted uppercase tracking-wider mb-3">Continuous Assessment (SBA)</h4>
              <div className="bg-brand-bg p-4 rounded-xl text-center text-xs text-brand-textMuted">
                <i className="ph ph-chart-line-up text-2xl text-brand-violet mb-1 block"></i>
                Terminal SBA continuous assessment entries are synchronized automatically with the teacher gradebook.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
