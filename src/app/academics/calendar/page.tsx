"use client";

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

export default function CalendarPage() {
  const [selectedTerm, setSelectedTerm] = useState<'term1' | 'term2' | 'term3'>('term2');

  const terms = {
    term1: {
      title: "Term 1 (Sept 2025 – Dec 2025)",
      status: "Completed",
      events: [
        { date: "Sept 09, 2025", title: "School Resumption for Term 1", desc: "All Crèche to JHS 3 pupils report to campus." },
        { date: "Oct 15, 2025", title: "Mid-Term Open Day & PTA Meeting", desc: "Interactive academic progress conference with teachers." },
        { date: "Nov 24 – Nov 28", title: "Revision Week & Mock 1 for JHS 3", desc: "First round of BECE preparation examinations." },
        { date: "Dec 08 – Dec 12", title: "Terminal Examinations", desc: "End of Term 1 assessment across all classes." },
        { date: "Dec 18, 2025", title: "Christmas Carol Service & Vacation", desc: "Official school closure for Christmas holidays." }
      ]
    },
    term2: {
      title: "Term 2 (Jan 2026 – Apr 2026)",
      status: "Active Term",
      events: [
        { date: "Jan 06, 2026", title: "Term 2 Academic Resumption", desc: "Commencement of standard instructional timetable." },
        { date: "Feb 12 – Feb 13", title: "Mid-Term Break", desc: "Two-day rest and remedial study period for pupils." },
        { date: "Feb 28, 2026", title: "Annual Inter-House Sports & Athletics Day", desc: "Track and field events at the school sports complex." },
        { date: "Mar 06, 2026", title: "Ghana Independence Day Observance", desc: "Cultural performances and cadet parade ceremony." },
        { date: "Mar 23 – Mar 27", title: "Mock 2 (JHS) & CBT Quiz Week", desc: "Assessment series in the computer laboratory." },
        { date: "Apr 06 – Apr 10", title: "Term 2 End-of-Term Examinations", desc: "Terminal exams and SBA score finalization." },
        { date: "Apr 16, 2026", title: "Vacation & Terminal Report Cards Release", desc: "Digital reports dispatched to Parent Portal." }
      ]
    },
    term3: {
      title: "Term 3 (May 2026 – July 2026)",
      status: "Upcoming",
      events: [
        { date: "May 05, 2026", title: "Term 3 Academic Resumption", desc: "Final promotional term for 2025/2026 session." },
        { date: "May 25 – May 29", title: "Science & STEAM Innovation Fair", desc: "Robotics demos and pupil invention displays." },
        { date: "June 15 – June 19", title: "BECE Final Mock Series (JHS 3)", desc: "Intensive exam simulation for national candidates." },
        { date: "July 06 – July 10", title: "Promotional Examinations (Crèche–JHS 2)", desc: "Class promotion assessment tests." },
        { date: "July 23, 2026", title: "2026 Speech, Prize Giving & Graduation Day", desc: "Grand celebration of academic and co-curricular achievements." }
      ]
    }
  };

  const handleDownloadCalendar = () => {
    toast.success("Downloading 2025/2026 Academic Calendar (PDF)...");
  };

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Academic Year 2025/2026"
        title="School Calendar & Important Dates"
        subtitle="Keep track of term resumptions, mid-term breaks, examination schedules, PTA meetings, and campus celebrations."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Academics', href: '/academics' },
          { label: 'Calendar' }
        ]}
        bgImage="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header & Term Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
            <div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain">
                Termly Schedule Breakdown
              </h2>
              <p className="text-sm text-brand-textMuted mt-1">Official dates sanctioned by GES and School Administration.</p>
            </div>
            <button
              onClick={handleDownloadCalendar}
              className="px-5 py-2.5 bg-brand-violetLight text-brand-violet hover:bg-brand-violet hover:text-white transition-all font-bold text-xs rounded-xl flex items-center gap-2 self-start sm:self-auto shadow-sm"
            >
              <i className="ph-bold ph-download-simple text-base"></i> Download Calendar (PDF)
            </button>
          </div>

          {/* Term Selector Buttons */}
          <div className="grid grid-cols-3 gap-3 p-1.5 bg-gray-100 rounded-2xl mb-10">
            <button
              onClick={() => setSelectedTerm('term1')}
              className={`py-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                selectedTerm === 'term1' ? 'bg-white text-brand-violet shadow-sm' : 'text-gray-600 hover:text-brand-textMain'
              }`}
            >
              Term 1
            </button>
            <button
              onClick={() => setSelectedTerm('term2')}
              className={`py-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                selectedTerm === 'term2' ? 'bg-white text-brand-violet shadow-sm' : 'text-gray-600 hover:text-brand-textMain'
              }`}
            >
              Term 2 <span className="hidden sm:inline text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-md ml-1 font-semibold">Active</span>
            </button>
            <button
              onClick={() => setSelectedTerm('term3')}
              className={`py-3 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                selectedTerm === 'term3' ? 'bg-white text-brand-violet shadow-sm' : 'text-gray-600 hover:text-brand-textMain'
              }`}
            >
              Term 3
            </button>
          </div>

          {/* Timeline of Events */}
          <div className="bg-brand-bg rounded-3xl p-6 sm:p-10 border border-gray-100">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-brand-textMain">{terms[selectedTerm].title}</h3>
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                selectedTerm === 'term2' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-200 text-gray-700'
              }`}>
                {terms[selectedTerm].status}
              </span>
            </div>

            <div className="space-y-6">
              {terms[selectedTerm].events.map((evt, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-brand-violet/30 transition-colors">
                  <div className="w-36 shrink-0">
                    <span className="text-xs font-bold text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-lg inline-block">
                      {evt.date}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-brand-textMain text-sm sm:text-base mb-1">{evt.title}</h4>
                    <p className="text-xs text-brand-textMuted leading-relaxed">{evt.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
