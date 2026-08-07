"use client";

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

export default function EventsPage() {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [rsvpEvent, setRsvpEvent] = useState<string | null>(null);
  const [rsvpName, setRsvpName] = useState('');
  const [rsvpPhone, setRsvpPhone] = useState('');

  const events = [
    {
      slug: "annual-speech-prize-giving-day-2026",
      title: "2026 Annual Speech, Prize Giving & 9th Graduation Ceremony",
      category: "Celebration",
      date: "July 23, 2026",
      time: "09:00 AM – 01:30 PM",
      location: "Main School Auditorium",
      month: "JUL",
      day: "23",
      featured: true,
      desc: "Our flagship annual celebration honoring academic distinction, co-curricular leadership, outstanding faculty, and graduating JHS 3 candidates.",
      img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1000",
      highlights: ["Guest of Honor Keynote", "Award Conferments & Scholarships", "Cultural Troupe & Brass Band Performances"]
    },
    {
      slug: "inter-house-athletics-championship-2026",
      title: "Annual Inter-House Sports & Athletics Championship",
      category: "Sports",
      date: "February 28, 2026",
      time: "08:30 AM – 03:00 PM",
      location: "School Sports Complex",
      month: "FEB",
      day: "28",
      featured: false,
      desc: "Red, Yellow, Green, and Blue Houses battle across 100m dashes, 4x100m relays, high jump, tug of war, and gymnastics.",
      img: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800",
      highlights: ["Track & Field Events", "House March Past & Cadet Salute", "Parent-Teacher Friendly Relay"]
    },
    {
      slug: "science-steam-robotics-innovation-fair",
      title: "Annual STEAM & Robotics Innovation Exhibition",
      category: "Academic",
      date: "May 27, 2026",
      time: "10:00 AM – 02:00 PM",
      location: "ICT Laboratory & Quadrangle",
      month: "MAY",
      day: "27",
      featured: false,
      desc: "Pupils showcase hands-on robotics prototypes, renewable solar gadgets, chemical experiments, and Scratch programming demos.",
      img: "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80&w=800",
      highlights: ["Pupil Invention Pavilions", "Live Robot Driving Demos", "Judge Panel Evaluations"]
    },
    {
      slug: "term-2-pta-general-assembly-2026",
      title: "Term 2 PTA General Assembly & Open Day",
      category: "PTA",
      date: "March 14, 2026",
      time: "09:30 AM – 12:30 PM",
      location: "Campus Assembly Hall",
      month: "MAR",
      day: "14",
      featured: false,
      desc: "A collaborative session between parents, management, and subject teachers to review Term 2 academic metrics and developmental projects.",
      img: "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800",
      highlights: ["Headmaster's Academic Briefing", "One-on-One Teacher Consultations", "Financial & Project Updates"]
    },
    {
      slug: "ghana-independence-day-cultural-parade",
      title: "Ghana 69th Independence Day Observance & Cultural Durbar",
      category: "Celebration",
      date: "March 06, 2026",
      time: "08:00 AM – 12:00 PM",
      location: "School Parade Grounds",
      month: "MAR",
      day: "06",
      featured: false,
      desc: "A patriotic durbar of chiefs, pupil cadet inspection, traditional drumming and dancing, and cultural folklore recitals.",
      img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800",
      highlights: ["School Cadet Inspection", "Traditional Attire Display", "National History Quiz"]
    },
    {
      slug: "bece-candidates-dedication-service-2026",
      title: "JHS 3 BECE Candidates' Dedication & Prayer Service",
      category: "Academic",
      date: "June 20, 2026",
      time: "09:00 AM – 11:30 AM",
      location: "School Chapel & Hall",
      month: "JUN",
      day: "20",
      featured: false,
      desc: "A solemn benediction service for our final year Junior High School scholars as they enter the national examination period.",
      img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800",
      highlights: ["Candidate Blessing Ceremony", "Proprietress Encouragement", "Exam Stationery Kits Distribution"]
    }
  ];

  const handleRsvpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rsvpName || !rsvpPhone) {
      toast.error("Please enter your name and contact number.");
      return;
    }
    toast.success(`RSVP confirmed for ${rsvpName}! An SMS reminder will be sent.`);
    setRsvpEvent(null);
    setRsvpName('');
    setRsvpPhone('');
  };

  const handleAddToCalendar = (title: string, date: string) => {
    toast.success(`Event added to calendar: ${title}`);
  };

  const filteredEvents = selectedFilter === 'all'
    ? events
    : events.filter(e => e.category.toLowerCase() === selectedFilter.toLowerCase());

  const featuredEvent = events.find(e => e.featured) || events[0];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="School Happenings"
        title="Events & Campus Calendar"
        subtitle="Stay engaged with our upcoming celebrations, PTA conferences, sports days, academic fairs, and ceremonial milestones."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Community', href: '/news' },
          { label: 'Upcoming Events' }
        ]}
        bgImage="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2000"
      />

      {/* 1. FEATURED COUNTDOWN EVENT */}
      <section className="py-16 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-brand-violetDark via-brand-violet to-purple-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl overflow-hidden relative">
            
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7">
                <span className="px-3.5 py-1 bg-brand-yellow text-yellow-950 text-xs font-bold rounded-full uppercase tracking-wider inline-block mb-4 shadow-sm">
                  ★ Highlight of the Academic Year
                </span>
                <h2 className="text-2xl sm:text-4xl font-serif font-bold leading-tight mb-4 text-white">
                  {featuredEvent.title}
                </h2>
                <p className="text-sm sm:text-base text-brand-violetLight/90 leading-relaxed mb-6">
                  {featuredEvent.desc}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm text-gray-200 mb-8">
                  <div className="flex items-center gap-2.5">
                    <i className="ph-fill ph-calendar text-brand-yellow text-lg"></i>
                    <span><strong>Date:</strong> {featuredEvent.date}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <i className="ph-fill ph-clock text-brand-yellow text-lg"></i>
                    <span><strong>Time:</strong> {featuredEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2.5 sm:col-span-2">
                    <i className="ph-fill ph-map-pin text-brand-yellow text-lg"></i>
                    <span><strong>Venue:</strong> {featuredEvent.location}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={() => setRsvpEvent(featuredEvent.title)}
                    className="px-6 py-3 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 text-xs shadow-lg transition-all flex items-center gap-2"
                  >
                    <i className="ph-bold ph-ticket"></i> Reserve Guest Seat
                  </button>
                  <Link
                    href={`/events/${featuredEvent.slug}`}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs backdrop-blur-md transition-all flex items-center gap-2 border border-white/20"
                  >
                    Event Program Details <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20">
                  <img
                    src={featuredEvent.img}
                    alt={featuredEvent.title}
                    className="w-full h-80 object-cover"
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 2. EVENT CATALOG & FILTER */}
      <section className="py-20 bg-brand-bg flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-1 block">
                Upcoming Schedules
              </span>
              <h3 className="text-3xl font-serif font-bold text-brand-textMain">
                All School Events & Gatherings
              </h3>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {['all', 'Celebration', 'Academic', 'Sports', 'PTA'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedFilter(cat)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    selectedFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-brand-violet text-white shadow-md'
                      : 'bg-white text-brand-textMuted hover:text-brand-textMain border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat === 'all' ? 'All Events' : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Events Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((evt) => (
              <div
                key={evt.slug}
                className="bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:border-brand-violet/30 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="h-48 overflow-hidden relative">
                    <img
                      src={evt.img}
                      alt={evt.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-center shadow-md border border-white/40">
                      <span className="text-[10px] font-bold uppercase text-brand-violet block">{evt.month}</span>
                      <span className="text-xl font-serif font-bold text-brand-textMain block leading-tight">{evt.day}</span>
                    </div>
                    <span className="absolute top-4 right-4 bg-brand-violet text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                      {evt.category}
                    </span>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center gap-2 text-xs text-brand-textMuted mb-2">
                      <i className="ph-fill ph-clock text-brand-violet"></i>
                      <span>{evt.time}</span>
                    </div>

                    <h4 className="font-serif font-bold text-xl text-brand-textMain mb-2 group-hover:text-brand-violet transition-colors leading-snug">
                      {evt.title}
                    </h4>

                    <p className="text-xs text-brand-textMuted leading-relaxed mb-4">
                      {evt.desc}
                    </p>

                    <div className="text-xs text-gray-500 flex items-center gap-1.5 pt-3 border-t border-gray-100">
                      <i className="ph-fill ph-map-pin text-gray-400"></i>
                      <span className="truncate">{evt.location}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex items-center justify-between gap-2">
                  <Link
                    href={`/events/${evt.slug}`}
                    className="text-xs font-bold text-brand-violet hover:underline flex items-center gap-1"
                  >
                    View Details <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                  <button
                    onClick={() => setRsvpEvent(evt.title)}
                    className="px-3.5 py-1.5 bg-brand-violetLight text-brand-violet hover:bg-brand-violet hover:text-white transition-all font-bold text-xs rounded-lg"
                  >
                    RSVP / Attend
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Academic Calendar Link CTA */}
          <div className="mt-16 bg-white p-8 rounded-3xl border border-gray-200/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Full Year Overview</span>
              <h4 className="text-xl sm:text-2xl font-serif font-bold text-brand-textMain mt-1 mb-1">
                Need the 2025/2026 Academic Term Schedules?
              </h4>
              <p className="text-xs sm:text-sm text-brand-textMuted">
                View term start dates, examination timetables, and vacation periods in our Academic Calendar.
              </p>
            </div>
            <Link
              href="/academics/calendar"
              className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shrink-0 shadow-md flex items-center gap-2"
            >
              <i className="ph-bold ph-calendar"></i> View Academic Calendar
            </Link>
          </div>

        </div>
      </section>

      {/* RSVP Modal */}
      {rsvpEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 animate-fade-in relative">
            <button
              onClick={() => setRsvpEvent(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-base"
            >
              ✕
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Event Attendance</span>
            <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-2">Reserve Your Seat</h3>
            <p className="text-xs text-brand-textMuted mb-6">
              You are RSVPing for: <strong className="text-brand-textMain">{rsvpEvent}</strong>
            </p>

            <form onSubmit={handleRsvpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={rsvpName}
                  onChange={(e) => setRsvpName(e.target.value)}
                  placeholder="e.g. Mrs. Vivian Mensah"
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Phone / WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={rsvpPhone}
                  onChange={(e) => setRsvpPhone(e.target.value)}
                  placeholder="024 000 0000"
                  className="w-full bg-brand-bg border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setRsvpEvent(null)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shadow-md"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
