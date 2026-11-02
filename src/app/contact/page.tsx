"use client";

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [isSent, setIsSent] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    department: 'General Inquiries',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.message) {
      toast.error("Please fill in the required fields.");
      return;
    }
    setIsSent(true);
    toast.success("Thank you! Your message has been sent to our administration.");
  };

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Get in Touch"
        title="We'd Love to Hear From You"
        subtitle="Reach out to our administrative desk, schedule a campus visit, or inquire about enrollment."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Contact Us' }
        ]}
        bgImage="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
            
            {/* Contact Details & Direct Channels */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                  Campus Coordinates
                </span>
                <h2 className="text-3xl font-serif font-bold text-brand-textMain mb-4">
                  The Roseland Preparatory School
                </h2>
                <p className="text-sm text-brand-textMuted leading-relaxed">
                  Located in the serene, accessible residential district of the Ga West Municipality, Greater Accra Region, Ghana.
                </p>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-4 p-4 bg-brand-bg rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-xl shrink-0">
                    <i className="ph-fill ph-map-pin"></i>
                  </div>
                  <div>
                    <strong className="block text-brand-textMain font-bold">Physical Location</strong>
                    <span className="text-xs text-brand-textMuted">PJ9H+FCX, Adjen Kotoku, Greater Accra, Ghana</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-brand-bg rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-brand-yellowLight text-yellow-800 flex items-center justify-center text-xl shrink-0">
                    <i className="ph-fill ph-phone-call"></i>
                  </div>
                  <div>
                    <strong className="block text-brand-textMain font-bold">Phone Helplines</strong>
                    <span className="text-xs text-brand-textMuted block">+233243968988</span>
                    <span className="text-[11px] text-gray-400">Available Mon–Fri, 7:30 AM – 4:30 PM</span>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-brand-bg rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center text-xl shrink-0">
                    <i className="ph-fill ph-envelope-simple"></i>
                  </div>
                  <div>
                    <strong className="block text-brand-textMain font-bold">Official Email</strong>
                    <span className="text-xs text-brand-textMuted">info@roselandpreparatory.edu.gh</span>
                  </div>
                </div>
              </div>

              {/* Direct WhatsApp Action */}
              <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl flex items-center justify-between shadow-lg">
                <div>
                  <h4 className="font-bold text-base">Instant WhatsApp Desk</h4>
                  <p className="text-xs text-emerald-100 mt-0.5">Quick responses to admissions questions.</p>
                </div>
                <a
                  href="https://wa.me/233243968988"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl shadow hover:bg-emerald-50 transition-colors shrink-0 flex items-center gap-1.5"
                >
                  <i className="ph-fill ph-whatsapp-logo text-base"></i> Chat Now
                </a>
              </div>
            </div>

            {/* Interactive Inquiry Form */}
            <div className="lg:col-span-7">
              <div className="bg-brand-bg p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-sm">
                <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-2">Send Us a Direct Message</h3>
                <p className="text-xs text-brand-textMuted mb-8">We will route your message to the appropriate department coordinator.</p>

                {isSent ? (
                  <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                      <i className="ph-fill ph-paper-plane-tilt"></i>
                    </div>
                    <h4 className="text-xl font-serif font-bold text-brand-textMain mb-2">Message Dispatched!</h4>
                    <p className="text-xs text-brand-textMuted max-w-sm mx-auto mb-6">
                      Thank you for contacting Roseland. Our desk will follow up promptly via phone or email.
                    </p>
                    <button
                      onClick={() => setIsSent(false)}
                      className="px-6 py-2.5 bg-brand-violet text-white font-bold rounded-xl text-xs"
                    >
                      Send Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Your Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        placeholder="e.g. Kwesi Mensah"
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
                          placeholder="kwesi@example.com"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Department</label>
                      <select
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                      >
                        <option value="General Inquiries">General School Inquiries</option>
                        <option value="Admissions Desk">Admissions & Enrollment</option>
                        <option value="Accounts & Finance">Accounts & Fee Payments</option>
                        <option value="Transport Coordinator">Bus & Transport Services</option>
                        <option value="Headmaster's Office">Headmaster's Secretariat</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Message / Inquiry *</label>
                      <textarea
                        rows={4}
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                        placeholder="How can we assist you today?"
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-all text-sm shadow-md"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>

          {/* Map Preview Container */}
          <div className="rounded-3xl overflow-hidden shadow-lg border border-gray-200 h-80 relative bg-gray-100 flex items-center justify-center text-center p-6">
            <div className="max-w-md">
              <i className="ph-fill ph-map-pin text-brand-violet text-4xl mb-2"></i>
              <h4 className="font-bold text-brand-textMain text-base">Campus Location (Ga West, Greater Accra)</h4>
              <p className="text-xs text-brand-textMuted mt-1 mb-4">Conveniently accessible via Amasaman and Pokuase thoroughfares.</p>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2 bg-brand-violet text-white font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <i className="ph-bold ph-navigation-arrow"></i> Open in Google Maps
              </a>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
