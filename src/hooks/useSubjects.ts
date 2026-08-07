'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { RoselandApi, SubjectRecord } from '@/lib/api';

export function useSubjects(params?: {
  level_category?: string;
  department?: string;
  is_core?: boolean;
  is_active?: boolean;
}) {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await RoselandApi.academic.getSubjects(params);
      if (Array.isArray(data)) {
        setSubjects(data);
      } else {
        setSubjects([]);
      }
    } catch (err: any) {
      console.warn('Failed to load canonical subjects from academic service:', err.message);
      setError(err.message || 'Failed to load subjects');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }, [params?.level_category, params?.department, params?.is_core, params?.is_active]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const coreSubjects = useMemo(() => {
    return subjects.filter((s) => s.is_core);
  }, [subjects]);

  const electiveSubjects = useMemo(() => {
    return subjects.filter((s) => !s.is_core);
  }, [subjects]);

  const byDepartment = useMemo(() => {
    const map: Record<string, SubjectRecord[]> = {};
    subjects.forEach((s) => {
      const dept = s.department || 'GENERAL';
      if (!map[dept]) map[dept] = [];
      map[dept].push(s);
    });
    return map;
  }, [subjects]);

  const getSubjectsForLevel = useCallback((levelCategory?: string): SubjectRecord[] => {
    if (!levelCategory) return subjects;
    const target = levelCategory.trim().toUpperCase();
    return subjects.filter((s) => {
      const categories = (s.level_categories || '')
        .split(',')
        .map((c) => c.trim().toUpperCase());
      return categories.includes(target);
    });
  }, [subjects]);

  const getSubjectByName = useCallback((name?: string): SubjectRecord | undefined => {
    if (!name) return undefined;
    const clean = name.trim().toLowerCase();
    return subjects.find((s) => s.name.trim().toLowerCase() === clean);
  }, [subjects]);

  return {
    subjects,
    coreSubjects,
    electiveSubjects,
    byDepartment,
    getSubjectsForLevel,
    getSubjectByName,
    loading,
    error,
    refresh: fetchSubjects,
  };
}
