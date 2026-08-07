"use client";

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import toast from 'react-hot-toast';

export default function CareersPage() {
  const [appliedJob, setAppliedJob] = useState<string | null>(null);

  const vacancies = [
    {
      id: "jhs-science",
      title: "JHS Integrated Science & Practical Specialist",
      type: "Full-Time",
      department: "Junior High School",
      req: "B.Ed or B.Sc in Integrated Science with at least 3 years BECE track record."
    },
    {
      id: "early-childhood",
      title: "Early Childhood / Phonics Lead Teacher",
      type: "Full-Time",
      department: "Crèche & Nursery",
      req: "Diploma or Degree in Early Childhood Pedagogy with Jolly Phonics certification."
    },
    {
      id: "ict-tutor",
      title: "Computing / ICT & CBT Lab Instructor",
      type: "Full-Time",
      department: "Primary & JHS",
      req: "B.Sc Computer Science / IT with proficiency in Python/Scratch and lab networking."
    },
    {
      id: "french-teacher",
      title: "French Language Instructor",
      type: "Part-Time / Full-Time",
      department: "Primary School",
      req: "B.A. French Education with active conversational engagement pedagogy."
    }
  ];

  const handleApply = (jobTitle: string) => {
    setAppliedJob(jobTitle);
    toast.success(`Application modal opened for: ${jobTitle}`);
  };

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Join Our Faculty"
        title="Careers & Teaching Opportunities"
        subtitle="Shape the next generation of leaders. We offer competitive remuneration, continuous professional training, and an inspiring work culture."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Careers' }
        ]}
        bgImage="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Why Teach at Roseland */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-20">
            <div className="p-8 rounded-3xl bg-brand-bg border border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-2xl mb-4">
                <i className="ph-fill ph-certificate"></i>
              </div>
              <h3 className="text-xl font-bold text-brand-textMain mb-2">Continuous CPD</h3>
              <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
                Regular NTC-accredited workshops, modern pedagogical training, and subsidized educational certifications.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-brand-bg border border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-brand-yellowLight text-yellow-800 flex items-center justify-center text-2xl mb-4">
                <i className="ph-fill ph-laptop"></i>
              </div>
              <h3 className="text-xl font-bold text-brand-textMain mb-2">Modern EdTech Tools</h3>
              <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
                Classrooms equipped with high-speed internet, computerized testing systems, and digital grading cockpits.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-brand-bg border border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center text-2xl mb-4">
                <i className="ph-fill ph-hand-heart"></i>
              </div>
              <h3 className="text-xl font-bold text-brand-textMain mb-2">Supportive Culture</h3>
              <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
                Competitive compensation, daily staff lunches, health insurance coverage, and staff child tuition concessions.
              </p>
            </div>
          </div>

          {/* Current Job Openings */}
          <div className="mb-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Open Vacancies (2026/2027)
              </span>
              <h2 className="text-3xl font-serif font-bold text-brand-textMain">
                Current Teaching & Staff Openings
              </h2>
            </div>

            <div className="space-y-4">
              {vacancies.map((job) => (
                <div
                  key={job.id}
                  className="bg-brand-bg p-6 sm:p-8 rounded-3xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:shadow-lg transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-xs font-bold text-brand-violet bg-brand-violetLight px-2.5 py-0.5 rounded-full uppercase">
                        {job.department}
                      </span>
                      <span className="text-xs font-semibold text-gray-500">• {job.type}</span>
                    </div>
                    <h4 className="text-xl font-serif font-bold text-brand-textMain mb-2">{job.title}</h4>
                    <p className="text-xs text-brand-textMuted max-w-xl">{job.req}</p>
                  </div>

                  <a
                    href="mailto:careers@roselandpreparatory.edu.gh?subject=Application for Position: "
                    className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shrink-0 self-start sm:self-auto transition-colors"
                  >
                    Submit CV & Application
                  </a>
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
