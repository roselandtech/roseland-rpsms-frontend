/**
 * Shared academic reference data.
 *
 * GES_SUBJECTS is the canonical curricular list used wherever a subject is
 * selected — faculty allocation in the Staff module and period scheduling in
 * the Academics module. Keeping one definition means an allocation written
 * against a subject always matches the value a timetable slot is created with.
 */
export const GES_SUBJECTS = [
  "Mathematics",
  "English Language",
  "Integrated Science",
  "Computing / ICT",
  "Social Studies",
  "Ghanaian Language (Twi)",
  "Ghanaian Language (Ga)",
  "Creative Arts & Design",
  "French Language",
  "Religious & Moral Education (RME)",
  "Physical & Health Education (PHE)",
  "Career Technology"
] as const;

export type GesSubject = typeof GES_SUBJECTS[number];

/** Roles in the staff directory that may be assigned to teach a period. */
const TEACHING_ROLES = ['TEACHER', 'HEAD_TEACHER', 'HEADMASTER', 'ACADEMIC_HEAD'];

export interface TeacherOption {
  name: string;
  /** Subjects this teacher is formally allocated to, from faculty allocations. */
  subjects: string[];
  formClass?: string | null;
}

/**
 * Merges the auth staff directory with academic faculty allocations into one
 * list of assignable teachers.
 *
 * Allocations are the authority on who teaches what, but a teacher may exist in
 * the directory with no allocation yet (and, with legacy data, an allocation may
 * name someone absent from the directory). Both are included so the scheduler
 * never silently loses a name.
 */
export function buildTeacherOptions(
  staffDirectory: any[],
  allocations: any[]
): TeacherOption[] {
  const byName = new Map<string, TeacherOption>();

  const upsert = (name: string, subjects: string[], formClass?: string | null) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const existing = byName.get(trimmed);
    if (existing) {
      subjects.forEach((s) => {
        if (s && !existing.subjects.includes(s)) existing.subjects.push(s);
      });
      if (formClass && !existing.formClass) existing.formClass = formClass;
    } else {
      byName.set(trimmed, { name: trimmed, subjects: [...subjects], formClass: formClass ?? null });
    }
  };

  (Array.isArray(staffDirectory) ? staffDirectory : []).forEach((s) => {
    const role = String(s?.role || '').toUpperCase();
    if (!TEACHING_ROLES.includes(role)) return;
    upsert(s?.fullName || s?.full_name, [], s?.assignedClass ?? s?.assigned_class);
  });

  (Array.isArray(allocations) ? allocations : []).forEach((a) => {
    const subjects = Array.isArray(a?.subjects) ? a.subjects : [];
    upsert(a?.teacherName || a?.teacher_name, subjects, a?.formClass ?? a?.form_class);
  });

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/** Splits teachers into those allocated to `subject` and everyone else. */
export function partitionTeachersBySubject(teachers: TeacherOption[], subject: string) {
  if (!subject) return { allocated: [], others: teachers };
  const allocated = teachers.filter((t) => t.subjects.includes(subject));
  const others = teachers.filter((t) => !t.subjects.includes(subject));
  return { allocated, others };
}
