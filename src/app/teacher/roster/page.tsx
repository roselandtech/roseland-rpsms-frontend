"use client";

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import { AuthService } from '@/lib/auth';
import Modal from '@/components/ui/Modal';

interface Scholar {
  id: string;
  name: string;
  avatar: string;
  gender: 'Female' | 'Male';
  house: 'Red' | 'Yellow' | 'Green' | 'Blue';
  parentName: string;
  parentPhone: string;
  parentRelation: string;
  average: string;
  attendance: string;
  medicalNote?: string;
  housePoints: number;
}

export default function TeacherRoster() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [selectedScholar, setSelectedScholar] = useState<Scholar | null>(null);
  const [behaviorModalScholar, setBehaviorModalScholar] = useState<Scholar | null>(null);
  const [meritType, setMeritType] = useState<'Merit' | 'Demerit'>('Merit');
  const [points, setPoints] = useState<number>(5);
  const [behaviorNote, setBehaviorNote] = useState('');
  const [assignedClass, setAssignedClass] = useState('');
  const [classList, setClassList] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [scholars, setScholars] = useState<Scholar[]>([]);

  // 1. Initial Class context resolution
  useEffect(() => {
    const initClasses = async () => {
      try {
        const user = AuthService.getCurrentUser();
        let targetClass = user?.assignedClass || '';

        const [classRes, allocRes] = await Promise.allSettled([
          RoselandApi.sis.getClasses(),
          user ? RoselandApi.academic.getTeacherAllocation(user.email || user.username || user.id) : Promise.resolve(null),
        ]);

        const rawClasses =
          classRes.status === 'fulfilled'
            ? (Array.isArray(classRes.value?.data) ? classRes.value.data : Array.isArray(classRes.value) ? classRes.value : [])
            : [];

        const alloc = allocRes.status === 'fulfilled' ? allocRes.value : null;
        if (!targetClass && alloc?.formClass) {
          targetClass = alloc.formClass;
        }

        // For TEACHERS with specific assigned classes, prioritize their classes; for HEADMASTER/ADMIN or unallocated, show all classes
        const teacherClasses = new Set<string>();
        if (targetClass) teacherClasses.add(targetClass);
        if (alloc?.formClass) teacherClasses.add(alloc.formClass);
        if (Array.isArray(alloc?.assignedClasses)) {
          alloc.assignedClasses.forEach((c: string) => {
            if (c) teacherClasses.add(c);
          });
        }

        const isExecutive = user?.role === 'HEADMASTER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
        let finalClassList: { id: string; name: string; current_enrolled?: number }[] = rawClasses;

        if (!isExecutive && teacherClasses.size > 0) {
          const filtered = rawClasses.filter((c: any) => teacherClasses.has(c.name));
          if (filtered.length > 0) finalClassList = filtered;
        }

        setClassList(finalClassList);

        if (!targetClass && finalClassList.length > 0) {
          // Prefer the first class that actually has enrolled students so roster isn't blank
          const withStudents = finalClassList.find((c: any) => (c.current_enrolled ?? 0) > 0);
          targetClass = withStudents ? withStudents.name : finalClassList[0].name;
        }
        setAssignedClass(targetClass);
      } catch (err) {
        console.warn("Failed to load class registry", err);
      }
    };
    initClasses();
  }, []);

  // 2. Fetch Scholars for active class
  const loadScholars = useCallback(async () => {
    if (!assignedClass) return;
    setLoading(true);
    try {
      const res = await RoselandApi.sis.getStudents({ class_grade: assignedClass });
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      const houses: ('Red' | 'Yellow' | 'Green' | 'Blue')[] = ['Red', 'Yellow', 'Green', 'Blue'];
      const mapped: Scholar[] = list.map((s: any, idx: number) => {
        const sIndex = s.index_number || s.index_no || s.id;
        const fullName = s.full_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Scholar';
        const rawHouse = (s.house || '').toUpperCase();
        let house: 'Red' | 'Yellow' | 'Green' | 'Blue' = houses[idx % houses.length];
        if (rawHouse.includes('BLUE') || rawHouse.includes('SAPPHIRE')) house = 'Blue';
        else if (rawHouse.includes('YELLOW') || rawHouse.includes('GOLD')) house = 'Yellow';
        else if (rawHouse.includes('GREEN') || rawHouse.includes('EMERALD')) house = 'Green';
        else if (rawHouse.includes('RED') || rawHouse.includes('RUBY')) house = 'Red';

        const rawGender = String(s.gender || '').toUpperCase();
        const rawAvg = s.avg_score ?? s.academic_average;
        const rawAtt = s.attendance_pct ?? s.attendance_rate;

        return {
          id: sIndex,
          name: fullName,
          avatar: s.avatar || s.photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200`,
          gender: rawGender.startsWith('F') ? 'Female' : 'Male',
          house,
          parentName: s.parent_name || s.guardian_name || "Parent/Guardian",
          parentPhone: s.parent_phone || s.emergency_contact || "+233 24 000 0000",
          parentRelation: s.parent_relationship || "Guardian",
          average: rawAvg !== undefined && rawAvg !== null && Number(rawAvg) > 0 ? `${Math.round(Number(rawAvg))}%` : "Pending",
          attendance: rawAtt !== undefined && rawAtt !== null ? `${Math.round(Number(rawAtt))}%` : "100%",
          medicalNote: s.allergy_flag || s.medical_conditions || s.medical_note || undefined,
          housePoints: s.merit_points || 25,
        };
      });
      setScholars(mapped);
    } catch (err) {
      console.warn("Failed to load scholars", err);
      setScholars([]);
    } finally {
      setLoading(false);
    }
  }, [assignedClass]);

  useEffect(() => {
    loadScholars();
  }, [loadScholars]);

  const handleLogBehavior = async () => {
    if (!behaviorModalScholar) return;
    const delta = meritType === 'Merit' ? points : -points;
    setScholars(prev => prev.map(s => s.id === behaviorModalScholar.id ? { ...s, housePoints: Math.max(0, s.housePoints + delta) } : s));

    try {
      await RoselandApi.academic.logBehavior({
        studentId: behaviorModalScholar.id,
        studentName: behaviorModalScholar.name,
        type: meritType,
        points: delta,
        reason: behaviorNote || `${meritType} logged in class`,
        recordedBy: AuthService.getCurrentUser()?.fullName || 'Class Teacher'
      });
    } catch (err) {
      // Local fallback
    }

    toast.success(`${meritType === 'Merit' ? 'Awarded' : 'Deducted'} ${points} house points for ${behaviorModalScholar.name}!`);
    setBehaviorModalScholar(null);
    setBehaviorNote('');
  };

  const filteredScholars = scholars.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesHouse = selectedHouse === 'All' || s.house === selectedHouse;
    return matchesSearch && matchesHouse;
  });

  const femaleCount = scholars.filter(s => s.gender === 'Female').length;
  const maleCount = scholars.filter(s => s.gender === 'Male').length;
  const medicalAlertCount = scholars.filter(s => Boolean(s.medicalNote)).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            Classroom Registry • {assignedClass || 'Active Class'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Scholar Roster & 360° Profiles
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Manage student dossiers, log house merit points, and connect with parents directly.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {classList.length > 0 && (
            <select
              value={assignedClass}
              onChange={(e) => setAssignedClass(e.target.value)}
              className="bg-brand-bg border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-brand-violet"
            >
              {classList.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-4 pl-3 border-l border-gray-100">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Class Strength</span>
              <strong className="text-xl font-serif font-bold text-brand-violet">{scholars.length} Pupils</strong>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[11px] font-bold bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100">
              <span className="text-indigo-700">{maleCount} Boys</span>
              <span className="text-gray-300">•</span>
              <span className="text-rose-700">{femaleCount} Girls</span>
              {medicalAlertCount > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-red-600">{medicalAlertCount} Medical</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center bg-brand-bg rounded-2xl px-4 py-2.5 border border-gray-200/60 w-full md:max-w-md">
          <i className="ph-bold ph-magnifying-glass text-gray-400 text-sm"></i>
          <input
            type="text"
            placeholder="Search by scholar name or RPS index..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs ml-2 w-full placeholder-gray-400 font-semibold"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase hidden sm:inline">House:</span>
            <select
              value={selectedHouse}
              onChange={(e) => setSelectedHouse(e.target.value)}
              className="bg-brand-bg border border-gray-200 rounded-2xl px-3.5 py-2 text-xs font-bold outline-none focus:border-brand-violet"
            >
              <option value="All">All Houses ({scholars.length})</option>
              <option value="Red">Red House</option>
              <option value="Yellow">Yellow House</option>
              <option value="Green">Green House</option>
              <option value="Blue">Blue House</option>
            </select>
          </div>

          {/* View Switcher: Table Register vs Card Grid */}
          <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200/60">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-brand-violet shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="ph-bold ph-table text-sm"></i>
              Register Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-brand-violet shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <i className="ph-bold ph-squares-four text-sm"></i>
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Scholar Roster Content */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <div className="animate-spin w-8 h-8 border-3 border-brand-violet border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Loading classroom roster...</p>
        </div>
      ) : filteredScholars.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
          <h3 className="text-base font-serif font-bold text-brand-textMain mb-1">No Scholars Found</h3>
          <p className="text-xs text-brand-textMuted max-w-md mx-auto">
            {scholars.length === 0
              ? `There are currently no admitted pupils enrolled in ${assignedClass || 'this class'}. Newly admitted pupils enrolled from Admissions will automatically appear in this roster.`
              : `No scholars in ${assignedClass} match your current search or house filter.`}
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* Professional High-Density Class Register Table */
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 pl-6 pr-3 w-12">#</th>
                  <th className="py-3.5 px-4">Scholar & Index No.</th>
                  <th className="py-3.5 px-4">Gender & House</th>
                  <th className="py-3.5 px-4 text-center">CA Avg</th>
                  <th className="py-3.5 px-4 text-center">Attendance</th>
                  <th className="py-3.5 px-4 text-center">Merit Pts</th>
                  <th className="py-3.5 px-4">Parent / Emergency Contact</th>
                  <th className="py-3.5 pl-4 pr-6 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredScholars.map((scholar, index) => {
                  const initials = scholar.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(part => part[0]?.toUpperCase())
                    .join('');

                  return (
                    <tr
                      key={scholar.id}
                      className="hover:bg-brand-violet/[0.02] transition-colors group"
                    >
                      <td className="py-3.5 pl-6 pr-3 font-mono text-[11px] font-bold text-gray-400">
                        {String(index + 1).padStart(2, '0')}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-violet/10 text-brand-violet font-serif font-bold text-xs flex items-center justify-center border border-brand-violet/15 shrink-0">
                            {initials || 'RP'}
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() => setSelectedScholar(scholar)}
                              className="font-serif font-bold text-sm text-brand-textMain hover:text-brand-violet transition-colors text-left block leading-snug"
                            >
                              {scholar.name}
                            </button>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono font-bold text-gray-400">{scholar.id}</span>
                              {scholar.medicalNote && (
                                <span
                                  className="px-1.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[9px] font-bold border border-red-200"
                                  title={`Medical Note: ${scholar.medicalNote}`}
                                >
                                  ⚕ {scholar.medicalNote}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            scholar.gender === 'Female'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-indigo-50 text-indigo-700'
                          }`}>
                            {scholar.gender}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            scholar.house === 'Blue' ? 'bg-blue-100 text-blue-800' :
                            scholar.house === 'Yellow' ? 'bg-amber-100 text-amber-800' :
                            scholar.house === 'Green' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {scholar.house}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg ${
                          scholar.average === 'Pending'
                            ? 'bg-gray-100 text-gray-500 text-[10px]'
                            : 'bg-brand-bg text-brand-textMain'
                        }`}>
                          {scholar.average}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                          {scholar.attendance}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-bold text-xs text-brand-violet bg-brand-violet/10 px-2.5 py-1 rounded-lg">
                          ★ {scholar.housePoints}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="leading-tight">
                          <p className="font-bold text-gray-800 text-xs">{scholar.parentName}</p>
                          <p className="text-[11px] font-mono text-gray-500 mt-0.5">{scholar.parentPhone}</p>
                        </div>
                      </td>

                      <td className="py-3.5 pl-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const rawDigits = scholar.parentPhone.replace(/[^0-9]/g, '');
                              const teacherTitle = AuthService.getCurrentUser()?.fullName || 'Class Teacher';
                              const msg = encodeURIComponent(`Good day, this is ${teacherTitle} from The Roseland Preparatory School regarding your ward, ${scholar.name}.`);
                              window.open(`https://wa.me/${rawDigits}?text=${msg}`, '_blank');
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 font-bold text-[11px] rounded-xl hover:bg-emerald-100 transition-colors"
                            title="Message Parent on WhatsApp"
                          >
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBehaviorModalScholar(scholar);
                              setMeritType('Merit');
                              setPoints(5);
                            }}
                            className="px-2.5 py-1.5 bg-amber-50 text-amber-800 rounded-xl hover:bg-amber-100 transition-colors text-[11px] font-bold"
                            title="Award or Deduct House Points"
                          >
                            ★ Points
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedScholar(scholar)}
                            className="px-3 py-1.5 bg-brand-violetLight text-brand-violet rounded-xl hover:bg-brand-violet hover:text-white transition-colors text-[11px] font-bold"
                            title="Open 360° Scholar Dossier"
                          >
                            360° Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-semibold">
            <span>Showing {filteredScholars.length} of {scholars.length} enrolled scholars in {assignedClass}</span>
            <span>Click any scholar name or &ldquo;360° Profile&rdquo; to inspect full dossier</span>
          </div>
        </div>
      ) : (
        /* Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScholars.map((scholar) => (
            <div
              key={scholar.id}
              className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 bg-brand-violet/10 flex items-center justify-center rounded-2xl border border-gray-200">
                      <i className="ph-bold ph-student text-brand-violet text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-base text-brand-textMain leading-tight">{scholar.name}</h4>
                      <span className="text-[10px] font-mono text-gray-400 font-bold block">{scholar.id} • {scholar.gender}</span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    scholar.house === 'Blue' ? 'bg-blue-100 text-blue-800' :
                    scholar.house === 'Yellow' ? 'bg-amber-100 text-amber-800' :
                    scholar.house === 'Green' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {scholar.house} House
                  </span>
                </div>

                {/* Medical Notice */}
                {scholar.medicalNote && (
                  <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-[10px] font-bold flex items-center gap-1.5 mb-3">
                    <span>⚕ {scholar.medicalNote}</span>
                  </div>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs bg-brand-bg p-3 rounded-2xl border border-gray-100 mb-3">
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-bold block">CA Status</span>
                    <strong className="text-xs font-bold text-brand-textMain">{scholar.average}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-bold block">Attend.</span>
                    <strong className="text-xs font-bold text-green-700">{scholar.attendance}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-400 uppercase font-bold block">Points</span>
                    <strong className="text-xs font-bold text-brand-violet">★ {scholar.housePoints}</strong>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-gray-600 bg-gray-50/60 p-3 rounded-xl">
                  <p><strong>Guardian:</strong> {scholar.parentName} ({scholar.parentRelation})</p>
                  <p><strong>Phone:</strong> {scholar.parentPhone}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    const rawDigits = scholar.parentPhone.replace(/[^0-9]/g, '');
                    const teacherTitle = AuthService.getCurrentUser()?.fullName || 'Class Teacher';
                    const msg = encodeURIComponent(`Good day, this is ${teacherTitle} from The Roseland Preparatory School regarding your ward, ${scholar.name}.`);
                    window.open(`https://wa.me/${rawDigits}?text=${msg}`, '_blank');
                  }}
                  className="flex-1 py-2 bg-emerald-50 text-emerald-800 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors text-center"
                >
                  WhatsApp
                </button>
                <button
                  onClick={() => {
                    setBehaviorModalScholar(scholar);
                    setMeritType('Merit');
                    setPoints(5);
                  }}
                  className="p-2 bg-amber-50 text-amber-800 rounded-xl hover:bg-amber-100 transition-colors text-xs font-bold"
                  title="Award House Points"
                >
                  ★ Points
                </button>
                <button
                  onClick={() => setSelectedScholar(scholar)}
                  className="p-2 bg-brand-violetLight text-brand-violet rounded-xl hover:bg-brand-violet hover:text-white transition-colors text-xs font-bold"
                  title="View 360 Profile"
                >
                  360° Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* House Points Modal (Full-Viewport Portal) */}
      <Modal
        isOpen={Boolean(behaviorModalScholar)}
        onClose={() => setBehaviorModalScholar(null)}
        size="md"
        hideHeader
        bodyClassName="p-0"
      >
        {behaviorModalScholar && (
          <div className="bg-white rounded-3xl w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setBehaviorModalScholar(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base"
            >
              ✕
            </button>

            <h3 className="text-xl font-serif font-bold text-brand-textMain mb-1">
              Log House Points
            </h3>
            <p className="text-xs text-brand-textMuted mb-6">
              Recording behavior and character points for <strong>{behaviorModalScholar.name}</strong> ({behaviorModalScholar.house} House).
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMeritType('Merit')}
                  className={`py-3 rounded-2xl font-bold text-xs transition-all border ${
                    meritType === 'Merit' 
                      ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  ★ Merit Point (Reward)
                </button>
                <button
                  type="button"
                  onClick={() => setMeritType('Demerit')}
                  className={`py-3 rounded-2xl font-bold text-xs transition-all border ${
                    meritType === 'Demerit' 
                      ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-xs' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Demerit Point (Correction)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Points Allocation</label>
                <div className="flex gap-2">
                  {[1, 2, 5, 10].map(pt => (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => setPoints(pt)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        points === pt
                          ? 'bg-brand-violet text-white border-brand-violet'
                          : 'bg-brand-bg text-brand-textMain border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {meritType === 'Merit' ? `+${pt}` : `-${pt}`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Pedagogical Justification</label>
                <textarea
                  value={behaviorNote}
                  onChange={(e) => setBehaviorNote(e.target.value)}
                  placeholder="e.g. Exemplary peer collaboration during science practicals..."
                  rows={3}
                  className="w-full bg-brand-bg border border-gray-200 rounded-2xl p-3 text-xs outline-none focus:border-brand-violet"
                />
              </div>

              <button
                type="button"
                onClick={handleLogBehavior}
                className="w-full py-3.5 bg-brand-violet text-white font-bold rounded-2xl hover:bg-brand-violetDark shadow-md transition-all text-xs uppercase tracking-wider mt-2"
              >
                Confirm Point Entry
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Scholar 360 Dossier Modal (Full-Viewport Portal) */}
      <Modal
        isOpen={Boolean(selectedScholar)}
        onClose={() => setSelectedScholar(null)}
        size="lg"
        hideHeader
        bodyClassName="p-0"
      >
        {selectedScholar && (
          <div className="bg-white rounded-3xl w-full p-6 sm:p-8 relative">
            <button
              onClick={() => setSelectedScholar(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 border-b border-gray-100 pb-5 mb-5">
              <div className="w-16 h-16 bg-brand-violet/10 flex items-center justify-center rounded-2xl border border-gray-200 shadow-sm">
                <i className="ph-bold ph-student text-brand-violet text-3xl"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-brand-violet bg-brand-violetLight px-2 py-0.5 rounded-md">
                    {selectedScholar.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    selectedScholar.gender === 'Female' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                  }`}>
                    {selectedScholar.gender}
                  </span>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1">{selectedScholar.name}</h3>
                <p className="text-xs text-brand-textMuted">{assignedClass} • {selectedScholar.house} House</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-brand-bg p-4 rounded-2xl space-y-2 border border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Continuous Assessment:</span>
                  <strong className="text-brand-textMain font-mono font-bold text-sm">{selectedScholar.average}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Term Attendance:</span>
                  <strong className="text-green-700 font-mono font-bold text-sm">{selectedScholar.attendance}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">House Points:</span>
                  <strong className="text-brand-violet font-mono font-bold text-sm">★ {selectedScholar.housePoints} Pts</strong>
                </div>
              </div>

              <div className="border border-gray-100 rounded-2xl p-4 space-y-2">
                <h4 className="font-bold text-brand-textMain uppercase text-[10px] text-gray-400">Emergency & Guardian Data</h4>
                <p><strong>Primary Guardian:</strong> {selectedScholar.parentName} ({selectedScholar.parentRelation})</p>
                <p><strong>Emergency Contact:</strong> {selectedScholar.parentPhone}</p>
                {selectedScholar.medicalNote && (
                  <p className="text-red-700 font-bold"><strong>Medical Alert:</strong> {selectedScholar.medicalNote}</p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const rawDigits = selectedScholar.parentPhone.replace(/[^0-9]/g, '');
                    const teacherTitle = AuthService.getCurrentUser()?.fullName || 'Class Teacher';
                    const msg = encodeURIComponent(`Good day, this is ${teacherTitle} from The Roseland Preparatory School regarding your ward, ${selectedScholar.name}.`);
                    window.open(`https://wa.me/${rawDigits}?text=${msg}`, '_blank');
                  }}
                  className="flex-1 py-3 bg-emerald-50 text-emerald-800 font-bold rounded-xl hover:bg-emerald-100 transition-all"
                >
                  Message Guardian (WhatsApp)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedScholar(null)}
                  className="flex-1 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark shadow-md transition-all"
                >
                  Close Profile
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
