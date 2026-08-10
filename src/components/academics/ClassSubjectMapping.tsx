"use client";

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';

export default function ClassSubjectMapping() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ code: string; name: string; is_core: boolean }[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  
  const [curriculum, setCurriculum] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [clsRes, subRes] = await Promise.all([
          RoselandApi.sis.getClasses(),
          RoselandApi.academic.getSubjects()
        ]);
        
        const clsList = Array.isArray(clsRes?.data) ? clsRes.data : Array.isArray(clsRes) ? clsRes : [];
        const subList = Array.isArray(subRes?.data) ? subRes.data : Array.isArray(subRes) ? subRes : [];
        
        setClasses(clsList);
        setSubjects(subList);
        
        if (clsList.length > 0) {
          setSelectedClass(clsList[0].name);
        }
      } catch (err) {
        toast.error("Failed to load classes or subjects");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchCurriculum = async () => {
      if (!selectedClass) return;
      try {
        const res = await RoselandApi.academic.curriculum.getForClass(selectedClass);
        setCurriculum(res || []);
      } catch (err) {
        toast.error(`Failed to load curriculum for ${selectedClass}`);
      }
    };
    fetchCurriculum();
  }, [selectedClass]);

  const handleToggleSubject = (subject: { code: string; name: string }) => {
    const exists = curriculum.find(c => c.subject_code === subject.code);
    if (exists) {
      setCurriculum(curriculum.filter(c => c.subject_code !== subject.code));
    } else {
      setCurriculum([...curriculum, {
        class_grade: selectedClass,
        subject_code: subject.code,
        subject_name: subject.name,
        is_elective: false
      }]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await RoselandApi.academic.curriculum.bulkAssign(selectedClass, curriculum);
      toast.success(`${selectedClass} curriculum updated successfully!`);
    } catch (err) {
      toast.error("Failed to save curriculum");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin w-8 h-8 border-3 border-brand-violet border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Curriculum Constraint Engine
          </span>
          <h2 className="text-xl font-serif font-bold text-brand-textMain">Class & Subject Mapping</h2>
          <p className="text-xs text-brand-textMuted mt-1 max-w-xl">
            Select a class to define the exact subjects their students are mandated to take. This constraint guarantees teachers only assess approved subjects.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-brand-violet hover:bg-brand-violetDark text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
        >
          {saving ? 'Saving...' : 'Save Curriculum Mapping'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Pane - Classes */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="font-bold text-brand-textMain text-sm uppercase tracking-wider">Select Class</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {classes.map(cls => (
              <button
                key={cls.id}
                onClick={() => setSelectedClass(cls.name)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                  selectedClass === cls.name 
                    ? 'bg-brand-violetLight/20 text-brand-violet'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {cls.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right Pane - Subjects */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[600px]">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h3 className="font-bold text-brand-textMain text-lg font-serif">
                {selectedClass} Curriculum
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Select the subjects that {selectedClass} students are mandated to take.
              </p>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-brand-violet shadow-sm">
              {curriculum.length} Subjects Assigned
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {subjects.map(sub => {
                const isAssigned = curriculum.some(c => c.subject_code === sub.code);
                return (
                  <div 
                    key={sub.code}
                    onClick={() => handleToggleSubject(sub)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${
                      isAssigned 
                        ? 'border-brand-violet bg-brand-violetLight/5' 
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      isAssigned ? 'bg-brand-violet text-white' : 'border-2 border-gray-300'
                    }`}>
                      {isAssigned && <i className="ph-bold ph-check text-[10px]"></i>}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${isAssigned ? 'text-brand-violet' : 'text-brand-textMain'}`}>
                        {sub.name}
                      </h4>
                      <p className="text-xs text-gray-400 font-medium mt-0.5">Code: {sub.code}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
