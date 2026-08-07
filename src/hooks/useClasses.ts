import { useState, useEffect, useCallback } from 'react';
import { RoselandApi } from '@/lib/api';

export interface SchoolClass {
  id: string;
  code: string;
  name: string;
  level_category: 'EARLY_YEARS' | 'LOWER_PRIMARY' | 'UPPER_PRIMARY' | 'JHS' | string;
  stage: string;
  stream_name: string;
  class_teacher_name?: string;
  room_number: string;
  capacity: number;
  current_enrolled: number;
  base_tuition_fee: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useClasses() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await RoselandApi.sis.getClasses();
      if (Array.isArray(data)) {
        setClasses(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch classes:', err);
      setError(err.message || 'Failed to load school classes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const earlyYears = classes.filter(c => c.level_category === 'EARLY_YEARS');
  const lowerPrimary = classes.filter(c => c.level_category === 'LOWER_PRIMARY');
  const upperPrimary = classes.filter(c => c.level_category === 'UPPER_PRIMARY');
  const jhs = classes.filter(c => c.level_category === 'JHS');

  return {
    classes,
    earlyYears,
    lowerPrimary,
    upperPrimary,
    jhs,
    isLoading,
    error,
    refreshClasses: fetchClasses,
  };
}
