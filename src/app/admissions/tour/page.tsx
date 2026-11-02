"use client";

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function TourPage() {
  const [isBooked, setIsBooked] = useState(false);
  const [formData, setFormData] = useState({
    parentName: '',
    phone: '',
    email: '',
    visitDate: '',
    visitTime: '09:00 AM',
    targetLevel: 'Primary School',
    attendees: '2'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.parentName || !formData.phone || !formData.visitDate) {
      toast.error("Please complete the required fields.");
      return;
    }
    setIsBooked(true);
    toast.success("Tour scheduled! Our admissions desk will call to confirm.");
  };

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Visit Our Campus"
        title="Schedule a Personalized School Tour"
        subtitle="Walk through our classrooms, explore the computer & science labs, meet our faculty, and experience the warmth of Roseland."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions', href: '/admissions' },
          { label: 'Campus Tour' }
        ]}
        bgImage="https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            {/* Tour Information Sidebar */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100">
                <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                  Visiting Information
                </span>
                <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-4">
                  What to Expect on Your Visit
                </h3>
                <ul className="space-y-4 text-xs sm:text-sm text-brand-textMuted">
                  <li className="flex items-start gap-3">
                    <i className="ph-fill ph-check-circle text-brand-violet text-lg shrink-0 mt-0.5"></i>
                    <span><strong>45-Minute Guided Walkthrough:</strong> Observe live class interactions across Crèche, Primary, or JHS.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <i className="ph-fill ph-check-circle text-brand-violet text-lg shrink-0 mt-0.5"></i>
                    <span><strong>Q&A with Administration:</strong> Direct consultation with the Headmaster and department coordinators.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <i className="ph-fill ph-check-circle text-brand-violet text-lg shrink-0 mt-0.5"></i>
                    <span><strong>Facility Inspection:</strong> Examine our ICT lab, science apparatus, library, playground, and infirmary.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-brand-violet text-white p-6 rounded-3xl">
                <h4 className="font-bold text-base mb-2">Visiting Hours</h4>
                <p className="text-xs text-brand-violetLight/90 leading-relaxed mb-4">
                  Monday – Friday: 08:30 AM to 02:00 PM<br />
                  Saturday: 09:00 AM to 12:00 PM (By prior appointment)
                </p>
                <a href="tel:+233243968988" className="text-xs font-bold text-brand-yellow flex items-center gap-1.5 hover:underline">
                  <i className="ph-fill ph-phone"></i> Call Direct: +233243968988
                </a>
              </div>
            </div>

            {/* Booking Form */}
            <div className="lg:col-span-7">
              {isBooked ? (
                <div className="bg-brand-bg p-8 sm:p-12 rounded-3xl border border-gray-100 text-center animate-fade-in">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                    <i className="ph-fill ph-calendar-check"></i>
                  </div>
                  <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-2">Tour Appointment Reserved!</h3>
                  <p className="text-sm text-brand-textMuted mb-6">
                    Thank you, <strong className="text-brand-textMain">{formData.parentName}</strong>. We look forward to hosting you on <strong>{formData.visitDate} at {formData.visitTime}</strong>.
                  </p>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs inline-block"
                  >
                    Back to Home
                  </Link>
                </div>
              ) : (
                <div className="bg-brand-bg p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-sm">
                  <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-2">Book Your Visit Slot</h3>
                  <p className="text-xs text-brand-textMuted mb-8">Please choose a convenient date and time for your family.</p>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.parentName}
                        onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                        placeholder="e.g. Mrs. Grace Osei"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="024 000 0000"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="grace@example.com"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Preferred Date *</label>
                        <input
                          type="date"
                          required
                          value={formData.visitDate}
                          onChange={(e) => setFormData({...formData, visitDate: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Preferred Time *</label>
                        <select
                          value={formData.visitTime}
                          onChange={(e) => setFormData({...formData, visitTime: e.target.value})}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                        >
                          <option value="09:00 AM">09:00 AM (Morning Session)</option>
                          <option value="11:00 AM">11:00 AM (Mid-Morning Session)</option>
                          <option value="01:00 PM">01:00 PM (Afternoon Session)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Interested Level</label>
                      <select
                        value={formData.targetLevel}
                        onChange={(e) => setFormData({...formData, targetLevel: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                      >
                        <option value="Crèche & Nursery">Crèche & Nursery</option>
                        <option value="Primary School">Primary School (P1–P6)</option>
                        <option value="Junior High School">Junior High School (JHS 1–JHS 3)</option>
                        <option value="Multiple Levels">Multiple Children / Levels</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm shadow-md"
                    >
                      Confirm Tour Reservation
                    </button>
                  </form>
                </div>
              )}
            </div>

          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
