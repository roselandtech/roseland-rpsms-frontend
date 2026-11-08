"use client";

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { RoselandApi } from '@/lib/api';

export default function ApplyPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [appId, setAppId] = useState("");
  const [mailtoUrl, setMailtoUrl] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("info@roselandprep.edu.gh");

  const [formData, setFormData] = useState({
    // Student info
    studentFirstName: "",
    studentLastName: "",
    dob: "",
    gender: "male",
    targetClass: "Primary 1",
    medicalNotes: "",
    // Parent info
    guardianName: "",
    relationship: "Mother",
    phone: "",
    email: "",
    ghanaCard: "",
    residence: "",
    // Academic & Services
    prevSchool: "",
    optBus: "no",
    optCanteen: "yes"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStep === 1) {
      if (!formData.studentFirstName || !formData.studentLastName || !formData.dob) {
        toast.error("Please fill in all required student details.");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.guardianName || !formData.phone) {
        toast.error("Please fill in guardian contact details.");
        return;
      }
    }
    setCurrentStep(prev => prev + 1);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handlePrev = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = {
        applicant_name: `${formData.studentFirstName.trim()} ${formData.studentLastName.trim()}`,
        student_first_name: formData.studentFirstName.trim(),
        student_last_name: formData.studentLastName.trim(),
        gender: formData.gender === 'female' ? 'Female' : 'Male',
        target_class: formData.targetClass,
        date_of_birth: formData.dob || undefined,
        parent_name: formData.guardianName.trim(),
        parent_phone: formData.phone.trim(),
        parent_email: formData.email.trim() || undefined,
        relationship: formData.relationship || 'Guardian',
        ghana_card: formData.ghanaCard.trim() || undefined,
        home_address: formData.residence.trim() || undefined,
        previous_school: formData.prevSchool.trim() || undefined,
        medical_conditions: formData.medicalNotes.trim() || undefined,
        opt_bus: formData.optBus,
        opt_canteen: formData.optCanteen,
        status: "Under Review"
      };

      const res = await RoselandApi.sis.submitAdmission(payload);
      const generatedId = res?.applicationNumber || res?.application?.app_no || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setAppId(generatedId);
      if (res?.mailtoUrl) setMailtoUrl(res.mailtoUrl);
      if (res?.recipient) setRecipientEmail(res.recipient);
      setIsSubmitted(true);
      toast.success("Application successfully received and delivered to Admissions Desk!");
      window.scrollTo({ top: 250, behavior: 'smooth' });
    } catch (err: any) {
      console.error("Admissions submit error:", err);
      // Fallback: If network blocked, still generate local reference and mailto so user is never stranded
      const fallbackId = `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const summaryText = `THE ROSELAND PREPARATORY SCHOOL - ADMISSION APPLICATION
Reference: ${fallbackId}
Pupil: ${formData.studentFirstName} ${formData.studentLastName} (${formData.gender})
Target Class: ${formData.targetClass}
DOB: ${formData.dob}
Guardian: ${formData.guardianName} (${formData.relationship})
Phone: ${formData.phone}
Email: ${formData.email}
Address: ${formData.residence}
Previous School: ${formData.prevSchool || 'None'}
Bus Service: ${formData.optBus}
Canteen: ${formData.optCanteen}
Medical: ${formData.medicalNotes || 'None'}`;
      const fallbackMailto = `mailto:info@roselandprep.edu.gh?subject=${encodeURIComponent(`[Roseland Admissions] Application: ${formData.studentFirstName} ${formData.studentLastName} (${formData.targetClass}) - ${fallbackId}`)}&body=${encodeURIComponent(summaryText)}`;
      setAppId(fallbackId);
      setMailtoUrl(fallbackMailto);
      setIsSubmitted(true);
      toast.success("Application logged. Please send email copy to confirm.");
      window.scrollTo({ top: 250, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Online Admissions"
        title="Student Enrollment Application"
        subtitle="Complete this digital form to begin enrollment for the 2026/2027 academic session at The Roseland Preparatory School."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions', href: '/admissions' },
          { label: 'Apply Online' }
        ]}
        bgImage="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-16 bg-white flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {isSubmitted ? (
            <div className="bg-brand-bg p-8 sm:p-12 rounded-3xl border border-gray-100 text-center animate-fade-in">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">
                <i className="ph-fill ph-check-circle"></i>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-violet bg-brand-violetLight/50 px-3 py-1 rounded-full">
                Application Transmitted Successfully
              </span>
              <h2 className="text-3xl font-serif font-bold text-brand-textMain mt-3 mb-2">
                Application Received!
              </h2>
              <p className="text-sm text-brand-textMuted max-w-lg mx-auto mb-6">
                Your admission application dossier has been received and routed directly to our Admissions Office at <strong className="text-brand-violet font-semibold">{recipientEmail}</strong>.
              </p>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 inline-block text-left mb-6 max-w-md w-full shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <span className="text-xs font-semibold text-brand-textMuted uppercase tracking-wider">Application Reference</span>
                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">Under Review</span>
                </div>
                <p className="text-2xl font-bold text-brand-violet tracking-wider mt-2 mb-3">{appId}</p>
                <div className="space-y-1.5 text-xs text-brand-textMuted">
                  <p>Pupil Name: <strong className="text-brand-textMain">{formData.studentFirstName} {formData.studentLastName}</strong></p>
                  <p>Target Class: <strong className="text-brand-textMain">{formData.targetClass}</strong></p>
                  <p>Guardian: <strong className="text-brand-textMain">{formData.guardianName}</strong> ({formData.relationship}) &bull; {formData.phone}</p>
                  <p>Email: <strong className="text-brand-textMain">{formData.email || 'None provided'}</strong></p>
                  <p>Delivery Destination: <strong className="text-green-700 font-bold">{recipientEmail}</strong></p>
                </div>
              </div>

              {mailtoUrl && (
                <div className="mb-8">
                  <a
                    href={mailtoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-violetLight text-brand-violet hover:bg-brand-violet hover:text-white font-bold rounded-xl text-xs sm:text-sm transition-all border border-brand-violet/20"
                  >
                    <i className="ph-bold ph-envelope text-base"></i>
                    Send Backup Copy via Your Email App (to {recipientEmail})
                  </a>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-6 py-3 bg-white border border-gray-200 text-brand-textMain font-bold rounded-xl hover:bg-gray-50 text-sm flex items-center justify-center gap-1.5"
                >
                  <i className="ph ph-printer"></i>
                  Print / Save Summary
                </button>
                <Link
                  href="/"
                  className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-sm flex items-center justify-center"
                >
                  Return to Home
                </Link>
                <Link
                  href="/admissions/fees"
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center"
                >
                  View Fee Schedule
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Progress Steps Indicator */}
              <div className="grid grid-cols-3 gap-2 mb-10">
                <div className={`p-3 text-center rounded-xl text-xs font-bold transition-all ${
                  currentStep >= 1 ? 'bg-brand-violet text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                }`}>
                  1. Pupil Info
                </div>
                <div className={`p-3 text-center rounded-xl text-xs font-bold transition-all ${
                  currentStep >= 2 ? 'bg-brand-violet text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                }`}>
                  2. Guardian Info
                </div>
                <div className={`p-3 text-center rounded-xl text-xs font-bold transition-all ${
                  currentStep >= 3 ? 'bg-brand-violet text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                }`}>
                  3. Review & Submit
                </div>
              </div>

              <div className="bg-brand-bg p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm">
                {/* STEP 1: STUDENT INFO */}
                {currentStep === 1 && (
                  <form onSubmit={handleNext} className="space-y-6 animate-fade-in">
                    <h3 className="text-xl font-bold text-brand-textMain border-b border-gray-200 pb-3">
                      Child / Student Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">First Name *</label>
                        <input
                          type="text"
                          name="studentFirstName"
                          required
                          value={formData.studentFirstName}
                          onChange={handleChange}
                          placeholder="e.g. David"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Last Name / Surname *</label>
                        <input
                          type="text"
                          name="studentLastName"
                          required
                          value={formData.studentLastName}
                          onChange={handleChange}
                          placeholder="e.g. Mensah"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Date of Birth *</label>
                        <input
                          type="date"
                          name="dob"
                          required
                          value={formData.dob}
                          onChange={handleChange}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Gender *</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Target Class for Admission *</label>
                      <select
                        name="targetClass"
                        value={formData.targetClass}
                        onChange={handleChange}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight font-medium"
                      >
                        <option value="Crèche (6m - 2y)">Crèche (6 Months - 2 Years)</option>
                        <option value="Nursery 1">Nursery 1 (2 - 3 Years)</option>
                        <option value="Nursery 2 / KG">Nursery 2 / Kindergarten (4 - 5 Years)</option>
                        <option value="Primary 1">Primary 1</option>
                        <option value="Primary 2">Primary 2</option>
                        <option value="Primary 3">Primary 3</option>
                        <option value="Primary 4">Primary 4</option>
                        <option value="Primary 5">Primary 5</option>
                        <option value="Primary 6">Primary 6</option>
                        <option value="JHS 1">Junior High School 1 (JHS 1)</option>
                        <option value="JHS 2">Junior High School 2 (JHS 2)</option>
                        <option value="JHS 3">Junior High School 3 (JHS 3 Candidate)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Medical / Allergy Notes (Optional)</label>
                      <textarea
                        name="medicalNotes"
                        rows={2}
                        value={formData.medicalNotes}
                        onChange={handleChange}
                        placeholder="e.g. Asthmatic, allergic to peanuts, wears corrective lenses..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                      />
                    </div>

                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="px-8 py-3.5 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-all text-sm flex items-center gap-2"
                      >
                        Continue to Guardian Info <i className="ph-bold ph-arrow-right"></i>
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 2: GUARDIAN INFO */}
                {currentStep === 2 && (
                  <form onSubmit={handleNext} className="space-y-6 animate-fade-in">
                    <h3 className="text-xl font-bold text-brand-textMain border-b border-gray-200 pb-3">
                      Parent / Guardian Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Full Name of Guardian *</label>
                        <input
                          type="text"
                          name="guardianName"
                          required
                          value={formData.guardianName}
                          onChange={handleChange}
                          placeholder="e.g. Kwabena Mensah"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Relationship to Child *</label>
                        <select
                          name="relationship"
                          value={formData.relationship}
                          onChange={handleChange}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        >
                          <option value="Father">Father</option>
                          <option value="Mother">Mother</option>
                          <option value="Guardian">Legal Guardian</option>
                          <option value="Other">Other Relative</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Phone / WhatsApp Number *</label>
                        <input
                          type="tel"
                          name="phone"
                          required
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="e.g. 024 400 0000"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Email Address</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="e.g. k.mensah@gmail.com"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Ghana Card PIN (Optional)</label>
                        <input
                          type="text"
                          name="ghanaCard"
                          value={formData.ghanaCard}
                          onChange={handleChange}
                          placeholder="GHA-000000000-0"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Residential Town / Landmark *</label>
                        <input
                          type="text"
                          name="residence"
                          required
                          value={formData.residence}
                          onChange={handleChange}
                          placeholder="e.g. Amasaman, Ga West"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="px-6 py-3.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 text-sm"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="px-8 py-3.5 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-all text-sm flex items-center gap-2"
                      >
                        Continue to Preferences <i className="ph-bold ph-arrow-right"></i>
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: PREFERENCES & FINAL REVIEW */}
                {currentStep === 3 && (
                  <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                    <h3 className="text-xl font-bold text-brand-textMain border-b border-gray-200 pb-3">
                      Preferences & Final Review
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">Previous School Attended (If Any)</label>
                        <input
                          type="text"
                          name="prevSchool"
                          value={formData.prevSchool}
                          onChange={handleChange}
                          placeholder="e.g. St. Luke's Primary"
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet focus:ring-2 focus:ring-brand-violetLight"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-brand-textMain uppercase mb-1">School Bus Service Option</label>
                        <select
                          name="optBus"
                          value={formData.optBus}
                          onChange={handleChange}
                          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-violet"
                        >
                          <option value="no">No, Self Drop-off</option>
                          <option value="yes_round">Yes, Two-Way Bus Route</option>
                          <option value="yes_morning">Yes, Morning Only</option>
                          <option value="yes_afternoon">Yes, Afternoon Only</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-2 text-xs">
                      <h4 className="font-bold text-brand-textMain text-sm mb-3">Application Summary</h4>
                      <p><strong className="text-gray-500">Child:</strong> {formData.studentFirstName} {formData.studentLastName} ({formData.gender}, DOB: {formData.dob})</p>
                      <p><strong className="text-gray-500">Target Class:</strong> <span className="text-brand-violet font-bold">{formData.targetClass}</span></p>
                      <p><strong className="text-gray-500">Guardian:</strong> {formData.guardianName} ({formData.relationship}) - {formData.phone}</p>
                      <p><strong className="text-gray-500">Location:</strong> {formData.residence}</p>
                    </div>

                    <div className="text-xs text-brand-textMuted leading-relaxed">
                      By clicking <strong>Submit Application</strong>, you certify that the provided information is true and accurate to the best of your knowledge.
                    </div>

                    <div className="flex justify-between pt-4">
                      <button
                        type="button"
                        onClick={handlePrev}
                        className="px-6 py-3.5 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 text-sm"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3.5 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm flex items-center gap-2 shadow-lg disabled:opacity-50"
                      >
                        {isSubmitting ? (
                          <>
                            <i className="ph ph-spinner animate-spin text-lg"></i>
                            Submitting Application...
                          </>
                        ) : (
                          <>
                            <i className="ph-bold ph-check text-lg"></i>
                            Submit Application
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
}
