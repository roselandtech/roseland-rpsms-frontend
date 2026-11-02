"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import Modal from '@/components/ui/Modal';

interface RawAssessment {
  id: string;
  title: string;
  category: 'classwork' | 'homework' | 'project' | 'midterm';
  max_score: number;
}

export default function CATrackerPage() {
  const [assignedClass, setAssignedClass] = useState('');
  const [subject, setSubject] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  
  const [assessments, setAssessments] = useState<RawAssessment[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [scoresMap, setScoresMap] = useState<Record<string, Record<string, number>>>({}); // [assessmentId][studentId] = score
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAss, setNewAss] = useState({ title: '', category: 'classwork', max_score: 20 });
  const [loading, setLoading] = useState(true);

  const [allocatedSubjects, setAllocatedSubjects] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      const user = AuthService.getCurrentUser();
      let targetClass = user?.assignedClass || '';
      let available: {id: string, name: string}[] = [];
      if (user) {
        try {
          const alloc = await RoselandApi.academic.getTeacherAllocation(user.email || user.username || user.id);
          
          if (alloc?.subjects && Array.isArray(alloc.subjects)) {
              setAllocatedSubjects(alloc.subjects);
          }
          
          const allowedClasses = new Set<string>();
          if (alloc?.formClass) allowedClasses.add(alloc.formClass);
          if (alloc?.assignedClasses && Array.isArray(alloc.assignedClasses)) {
            alloc.assignedClasses.forEach((c: string) => allowedClasses.add(c));
          }
          available = Array.from(allowedClasses).map(c => ({ id: c, name: c }));
        } catch (err) {}
      }
      setClassList(available);
      if (available.length > 0) setAssignedClass(available[0].name);
    };
    init();
  }, []);

  useEffect(() => {
    const loadCurriculum = async () => {
      if (!assignedClass) return;
      try {
        const res = await RoselandApi.academic.curriculum.getForClass(assignedClass);
        let allValidSubjects = [...allocatedSubjects];
        
        if (res && res.length > 0) {
          const names = res.map((s: any) => s.subject_name);
          names.forEach((n: string) => {
            if (!allValidSubjects.includes(n)) allValidSubjects.push(n);
          });
        }
        
        if (allValidSubjects.length > 0) {
            setAvailableSubjects(allValidSubjects);
            if (!allValidSubjects.includes(subject)) {
                setSubject(allocatedSubjects.length > 0 ? allocatedSubjects[0] : allValidSubjects[0]);
            }
        } else {
            setAvailableSubjects([]);
            setSubject('');
        }
      } catch (err) {
        if (allocatedSubjects.length > 0) {
            setAvailableSubjects(allocatedSubjects);
            if (!allocatedSubjects.includes(subject)) setSubject(allocatedSubjects[0]);
        }
      }
    };
    loadCurriculum();
  }, [assignedClass, allocatedSubjects]);

  const loadData = useCallback(async () => {
    if (!assignedClass || !subject) return;
    setLoading(true);
    try {
      // Load Students
      const studentsRes = await RoselandApi.sis.getStudents({ class_grade: assignedClass });
      const studentList = Array.isArray(studentsRes?.data) ? studentsRes.data : Array.isArray(studentsRes) ? studentsRes : [];
      setStudents(studentList);

      // Load Assessments
      const token = AuthService.getToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const assRes = await fetch(`${process.env.NEXT_PUBLIC_ACADEMIC_URL || 'http://localhost:8082'}/api/v1/academic/ca-tracker/assessments?class_grade=${assignedClass}&subject=${subject}`, { headers });
      const assData = await assRes.json();
      setAssessments(assData || []);

      // Load Scores
      const newScoresMap: Record<string, Record<string, number>> = {};
      for (const ass of (assData || [])) {
        const scoreRes = await fetch(`${process.env.NEXT_PUBLIC_ACADEMIC_URL || 'http://localhost:8082'}/api/v1/academic/ca-tracker/assessments/${ass.id}/scores`, { headers });
        const scores = await scoreRes.json();
        newScoresMap[ass.id] = {};
        for (const s of (scores || [])) {
           newScoresMap[ass.id][s.student_index_no] = s.score;
        }
      }
      setScoresMap(newScoresMap);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [assignedClass, subject]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [isCreating, setIsCreating] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const handleCreateAssessment = async () => {
    if (!newAss.title) return toast.error("Title required");
    const token = AuthService.getToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    setIsCreating(true);
    const toastId = toast.loading("Creating assessment...");
    try {
      await fetch(`${process.env.NEXT_PUBLIC_ACADEMIC_URL || 'http://localhost:8082'}/api/v1/academic/ca-tracker/assessments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: newAss.title,
          class_grade: assignedClass,
          subject: subject,
          category: newAss.category,
          max_score: newAss.max_score
        })
      });
      toast.success("Assessment created!", { id: toastId });
      setIsModalOpen(false);
      setNewAss({ title: '', category: 'classwork', max_score: 20 });
      loadData();
    } catch(err) {
      toast.error("Failed to create", { id: toastId });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveScore = async (assessmentId: string) => {
    const token = AuthService.getToken();
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
    
    const scoresToSubmit = Object.keys(scoresMap[assessmentId] || {}).map(studentId => ({
        student_index_no: studentId,
        score: scoresMap[assessmentId][studentId]
    }));

    setSavingIds(prev => new Set(prev).add(assessmentId));
    const toastId = toast.loading("Saving and syncing to Gradebook...");

    try {
      await fetch(`${process.env.NEXT_PUBLIC_ACADEMIC_URL || 'http://localhost:8082'}/api/v1/academic/ca-tracker/assessments/${assessmentId}/scores`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ scores: scoresToSubmit })
      });
      toast.success("Scores saved and auto-normalized to Gradebook!", { id: toastId });
    } catch (err) {
      toast.error("Failed to save scores", { id: toastId });
    } finally {
      setSavingIds(prev => {
        const next = new Set(prev);
        next.delete(assessmentId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto p-4 sm:p-8 animate-pulse">
        <div className="bg-white h-32 rounded-3xl border border-gray-100 shadow-sm"></div>
        <div className="bg-white h-16 w-full max-w-md rounded-3xl border border-gray-100 shadow-sm"></div>
        <div className="bg-white h-[50vh] rounded-3xl border border-gray-100 shadow-sm"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block mb-1">
            Dynamic Continuous Assessment
          </span>
          <h1 className="text-2xl font-serif font-bold text-brand-textMain">
            CA Auto-Normalization Engine
          </h1>
          <p className="text-xs text-brand-textMuted mt-1">
            Create unlimited assessments. Scores automatically compress into the 30% brackets in your terminal Gradebook.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
        >
          + Add New Assessment
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
        <select value={assignedClass} onChange={e => setAssignedClass(e.target.value)} className="bg-brand-bg rounded-xl px-4 py-2 text-xs font-bold">
          {classList.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <select value={subject} onChange={e => setSubject(e.target.value)} className="bg-brand-bg rounded-xl px-4 py-2 text-xs font-bold">
          {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {assessments.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-serif font-bold text-lg text-brand-textMain">No Assessments Yet</h3>
          <p className="text-xs text-brand-textMuted mt-1">Click "Add New Assessment" to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {assessments.map(ass => (
            <div key={ass.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 bg-brand-bg flex items-center justify-between border-b border-gray-100">
                <div>
                  <h4 className="font-serif font-bold text-brand-textMain text-lg">{ass.title}</h4>
                  <span className="text-xs font-bold uppercase text-brand-violet">{ass.category} • Max {ass.max_score} Marks</span>
                </div>
                <button 
                  onClick={() => handleSaveScore(ass.id)} 
                  disabled={savingIds.has(ass.id)}
                  className="px-4 py-2 bg-brand-violet text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {savingIds.has(ass.id) ? "Saving..." : "Save & Sync to Gradebook"}
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {students.map(s => {
                  const sId = s.index_no || s.id;
                  return (
                    <div key={sId} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl bg-gray-50/50">
                      <span className="text-xs font-bold text-brand-textMain truncate pr-2">{s.full_name || s.name}</span>
                      <input 
                        type="number"
                        max={ass.max_score}
                        min={0}
                        value={scoresMap[ass.id]?.[sId] || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setScoresMap(prev => ({
                            ...prev,
                            [ass.id]: {
                              ...(prev[ass.id] || {}),
                              [sId]: val
                            }
                          }));
                        }}
                        className="w-16 p-1.5 text-center text-xs font-bold rounded-md border border-gray-200 outline-none focus:border-brand-violet"
                        placeholder="--"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="New Assessment"
        subtitle="Formative Task Builder"
        size="md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-bold mb-1">Title</label>
            <input type="text" value={newAss.title} onChange={e => setNewAss({...newAss, title: e.target.value})} className="w-full bg-brand-bg p-2 rounded-xl border border-gray-200" />
          </div>
          <div>
            <label className="block font-bold mb-1">Category</label>
            <select value={newAss.category} onChange={e => setNewAss({...newAss, category: e.target.value as any})} className="w-full bg-brand-bg p-2 rounded-xl border border-gray-200">
              <option value="classwork">Classwork (10%)</option>
              <option value="homework">Homework (10%)</option>
              <option value="midterm">Midterm (10%)</option>
              <option value="exam">Terminal Exam (70%)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Max Score</label>
            <input type="number" value={newAss.max_score} onChange={e => setNewAss({...newAss, max_score: Number(e.target.value)})} className="w-full bg-brand-bg p-2 rounded-xl border border-gray-200" />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded-xl font-bold" disabled={isCreating}>Cancel</button>
            <button onClick={handleCreateAssessment} className="flex-1 py-2 bg-brand-violet text-white rounded-xl font-bold disabled:opacity-50" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
