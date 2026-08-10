"use client";

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { RoselandApi } from '@/lib/api';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

type PeriodStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED';

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
}

interface AcademicTerm {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  event_type: string;
}

export default function AcademicCalendarBuilder() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreatingYear, setIsCreatingYear] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [yearForm, setYearForm] = useState({ name: '', start_date: '', end_date: '', generateTerms: true });
  const [eventForm, setEventForm] = useState({ title: '', start_date: '', end_date: '', event_type: 'HOLIDAY' });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [y, t, e] = await Promise.all([
        RoselandApi.academic.calendar.getYears(),
        RoselandApi.academic.calendar.getTerms(),
        RoselandApi.academic.calendar.getEvents()
      ]);
      setYears(y);
      setTerms(t);
      setEvents(e);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load calendar data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const newYear = await RoselandApi.academic.calendar.createYear({
        name: yearForm.name,
        start_date: yearForm.start_date,
        end_date: yearForm.end_date
      });

      if (yearForm.generateTerms) {
        // Auto-generate 3 terms roughly split
        const yStart = new Date(yearForm.start_date);
        
        const t1Start = new Date(yStart);
        const t1End = new Date(yStart); t1End.setMonth(t1End.getMonth() + 3);
        
        const t2Start = new Date(t1End); t2Start.setDate(t2Start.getDate() + 14); // 2 week break
        const t2End = new Date(t2Start); t2End.setMonth(t2End.getMonth() + 3);

        const t3Start = new Date(t2End); t3Start.setDate(t3Start.getDate() + 14);
        const t3End = new Date(yearForm.end_date);

        await Promise.all([
          RoselandApi.academic.calendar.createTerm({ academic_year_id: newYear.id, name: 'Term 1', start_date: t1Start.toISOString().split('T')[0], end_date: t1End.toISOString().split('T')[0] }),
          RoselandApi.academic.calendar.createTerm({ academic_year_id: newYear.id, name: 'Term 2', start_date: t2Start.toISOString().split('T')[0], end_date: t2End.toISOString().split('T')[0] }),
          RoselandApi.academic.calendar.createTerm({ academic_year_id: newYear.id, name: 'Term 3', start_date: t3Start.toISOString().split('T')[0], end_date: t3End.toISOString().split('T')[0] })
        ]);
      }
      
      toast.success('Academic Year Setup Complete!');
      setIsCreatingYear(false);
      setYearForm({ name: '', start_date: '', end_date: '', generateTerms: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create year');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await RoselandApi.academic.calendar.createEvent(eventForm);
      toast.success('Event Added!');
      setIsCreatingEvent(false);
      setEventForm({ title: '', start_date: '', end_date: '', event_type: 'HOLIDAY' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: PeriodStatus) => {
    switch (status) {
      case 'ACTIVE': 
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800 tracking-wide uppercase"><i className="ph-fill ph-check-circle mr-1"></i> Active</span>;
      case 'PLANNED': 
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 tracking-wide uppercase"><i className="ph-fill ph-clock mr-1"></i> Planned</span>;
      case 'COMPLETED': 
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 tracking-wide uppercase"><i className="ph-fill ph-check-circle mr-1"></i> Completed</span>;
    }
  };

  if (isLoading) return <div className="p-8 text-center text-brand-textMuted">Loading Academic Calendar Engine...</div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      
      {/* Header aligned perfectly with the rest of the Admin Layout */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-violet block mb-1">
            System Clock
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
            Academic Calendar Engine
          </h1>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            Manage academic years, terms, milestones, and automated system clock transitions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="secondary" 
            className="text-xs px-4 py-2.5 shadow-sm" 
            icon={<i className="ph-bold ph-calendar-plus text-lg"></i>} 
            onClick={() => setIsCreatingEvent(true)}
          >
            Add Event
          </Button>
          <Button 
            variant="primary" 
            className="text-xs px-4 py-2.5 shadow-sm" 
            icon={<i className="ph-bold ph-calendar-blank text-lg"></i>} 
            onClick={() => setIsCreatingYear(true)}
          >
            Setup New Year
          </Button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Years & Terms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h2 className="text-lg font-serif font-bold text-brand-textMain mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <i className="ph-bold ph-calendar-blank text-brand-violet"></i>
              Academic Years & Terms
            </h2>
            
            <div className="space-y-6">
              {years.length === 0 && <p className="text-sm text-brand-textMuted text-center py-6">No academic years defined yet.</p>}
              {years.map(year => (
                <div key={year.id} className={`border rounded-2xl p-5 sm:p-6 transition-all ${year.status === 'ACTIVE' ? 'border-brand-violet bg-brand-violetLight/5 shadow-sm' : 'border-gray-100 bg-gray-50/50'}`}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-brand-textMain flex items-center gap-3">
                        {year.name}
                        {getStatusBadge(year.status)}
                      </h3>
                      <p className="text-xs text-brand-textMuted mt-1 font-medium flex items-center gap-1.5">
                        <i className="ph-bold ph-calendar-dots text-gray-400"></i> {year.start_date} to {year.end_date}
                      </p>
                    </div>
                    {year.status === 'ACTIVE' && (
                      <span className="text-[10px] font-bold text-brand-violet uppercase tracking-widest bg-white px-3 py-1.5 rounded-full border border-brand-violetLight shadow-sm shrink-0">
                        Current System Clock
                      </span>
                    )}
                  </div>

                  {/* Terms for this year */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {terms.filter(t => t.academic_year_id === year.id).map(term => (
                      <div key={term.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-colors ${term.status === 'ACTIVE' ? 'border-brand-violet ring-1 ring-brand-violet/20' : 'border-gray-100 hover:border-gray-200'}`}>
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-brand-textMain text-sm">{term.name}</span>
                          {getStatusBadge(term.status)}
                        </div>
                        <div className="text-[11px] text-brand-textMuted font-medium space-y-1.5">
                          <p className="flex justify-between"><span>Start:</span> <span className="text-gray-700">{term.start_date}</span></p>
                          <p className="flex justify-between"><span>End:</span> <span className="text-gray-700">{term.end_date}</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Events */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <h2 className="text-lg font-serif font-bold text-brand-textMain mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
              <i className="ph-bold ph-warning-circle text-amber-500"></i>
              Milestones & Holidays
            </h2>
            
            <div className="space-y-3">
              {events.map(event => (
                <div key={event.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-all bg-white group">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-brand-textMain text-sm group-hover:text-brand-violet transition-colors">{event.title}</h4>
                    <span className="px-2 py-1 bg-gray-50 text-brand-textMuted rounded border border-gray-100 text-[9px] font-bold uppercase tracking-widest shrink-0">
                      {event.event_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[11px] text-brand-textMuted font-medium flex items-center gap-1.5">
                    <i className="ph-bold ph-calendar text-gray-400"></i>
                    {event.start_date} {event.start_date !== event.end_date ? `to ${event.end_date}` : ''}
                  </p>
                </div>
              ))}
              
              {events.length === 0 && (
                <div className="text-center py-10">
                  <i className="ph-duotone ph-calendar-x text-4xl text-gray-200 mb-2"></i>
                  <p className="text-xs text-brand-textMuted">No upcoming events scheduled.</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-brand-violetLight/20 to-brand-violetLight/5 rounded-3xl p-6 border border-brand-violetLight/30">
            <h3 className="font-bold text-brand-violet mb-2 text-sm flex items-center gap-2">
               <i className="ph-bold ph-robot text-lg"></i> Automated Engine
            </h3>
            <p className="text-[11px] text-brand-textMain font-medium leading-relaxed">
              The Academic Engine runs automatically at <span className="font-bold text-brand-violet">00:01 daily</span>. Terms are transitioned from PLANNED to ACTIVE automatically when their start date arrives, instantly locking previous gradebooks and triggering billing cycles.
            </p>
          </div>
        </div>
      </div>

      {/* Setup Year Modal */}
      <Modal
        isOpen={isCreatingYear}
        onClose={() => setIsCreatingYear(false)}
        title="Setup Academic Year"
        size="md"
      >
        <form onSubmit={handleCreateYear} className="space-y-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-brand-textMain uppercase tracking-wider mb-2">Year Name (e.g. 2025/2026)</label>
            <input required type="text" value={yearForm.name} onChange={e => setYearForm({...yearForm, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-violet focus:border-brand-violet outline-none transition-all text-sm font-medium" placeholder="e.g. 2025/2026 Academic Year" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-textMain uppercase tracking-wider mb-2">Start Date</label>
              <input required type="date" value={yearForm.start_date} onChange={e => setYearForm({...yearForm, start_date: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-violet focus:border-brand-violet outline-none transition-all text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-textMain uppercase tracking-wider mb-2">End Date</label>
              <input required type="date" value={yearForm.end_date} onChange={e => setYearForm({...yearForm, end_date: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-violet focus:border-brand-violet outline-none transition-all text-sm font-medium" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2 bg-brand-violetLight/10 p-3 rounded-xl border border-brand-violetLight/20">
            <input type="checkbox" id="genTerms" checked={yearForm.generateTerms} onChange={e => setYearForm({...yearForm, generateTerms: e.target.checked})} className="w-4 h-4 rounded text-brand-violet focus:ring-brand-violet border-gray-300" />
            <label htmlFor="genTerms" className="text-xs font-bold text-brand-violet">Auto-generate 3 terms (can adjust dates later)</label>
          </div>
          <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-4">
            <Button type="button" variant="ghost" className="text-sm" onClick={() => setIsCreatingYear(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="text-sm shadow-sm" isLoading={isSubmitting}>Save Year Architecture</Button>
          </div>
        </form>
      </Modal>

      {/* Add Event Modal */}
      <Modal
        isOpen={isCreatingEvent}
        onClose={() => setIsCreatingEvent(false)}
        title="Add Calendar Event"
        size="md"
      >
        <form onSubmit={handleCreateEvent} className="space-y-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-brand-textMain uppercase tracking-wider mb-2">Event Title</label>
            <input required type="text" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-violet focus:border-brand-violet outline-none transition-all text-sm font-medium" placeholder="e.g. Mid-Term Break" />
          </div>
          <div>
            <label className="block text-xs font-bold text-brand-textMain uppercase tracking-wider mb-2">Event Type</label>
            <select value={eventForm.event_type} onChange={e => setEventForm({...eventForm, event_type: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-violet focus:border-brand-violet outline-none transition-all text-sm font-medium appearance-none">
              <option value="HOLIDAY">Holiday / Break</option>
              <option value="EXAM_WEEK">Examination Week</option>
              <option value="STAFF_ONLY">Staff Only (No Students)</option>
              <option value="ACADEMIC_DEADLINE">Academic Deadline</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-textMain uppercase tracking-wider mb-2">Start Date</label>
              <input required type="date" value={eventForm.start_date} onChange={e => setEventForm({...eventForm, start_date: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-violet focus:border-brand-violet outline-none transition-all text-sm font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-textMain uppercase tracking-wider mb-2">End Date</label>
              <input required type="date" value={eventForm.end_date} onChange={e => setEventForm({...eventForm, end_date: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-violet focus:border-brand-violet outline-none transition-all text-sm font-medium" />
            </div>
          </div>
          <div className="pt-6 flex justify-end gap-3 border-t border-gray-100 mt-4">
            <Button type="button" variant="ghost" className="text-sm" onClick={() => setIsCreatingEvent(false)}>Cancel</Button>
            <Button type="submit" variant="primary" className="text-sm shadow-sm" isLoading={isSubmitting}>Commit to Calendar</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
