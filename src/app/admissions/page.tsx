import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function AdmissionsPage() {
  const steps = [
    {
      num: "01",
      title: "Submit Online Application",
      desc: "Complete our simple digital enrollment form with the student's personal background, target class, and guardian contact details.",
      action: "Apply Online",
      href: "/admissions/apply"
    },
    {
      num: "02",
      title: "Assessment & Interactive Session",
      desc: "For Primary and JHS applicants, a gentle placement assessment in English, Mathematics, and reading readiness is conducted to ascertain learning level.",
      action: "Book a Tour",
      href: "/admissions/tour"
    },
    {
      num: "03",
      title: "Letter of Acceptance & Welcome Pack",
      desc: "Successful candidates receive an official admission letter, fee invoice, booklist, and uniform measurement guidelines.",
      action: "View Fee Schedule",
      href: "/admissions/fees"
    },
    {
      num: "04",
      title: "Fee Settlement & Onboarding",
      desc: "Complete registration fee and term tuition settlement via Mobile Money or Bank deposit to secure pupil's placement and portal credentials.",
      action: "Admissions FAQs",
      href: "/admissions/faq"
    }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Admissions 2026/2027"
        title="Begin Your Child's Journey with Roseland"
        subtitle="We welcome applications across Crèche, Nursery, Primary, and Junior High School. Discover our transparent, parent-friendly admission process."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions' }
        ]}
        bgImage="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2000"
      />

      {/* 1. ADMISSION PROCESS WORKFLOW */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Enrollment Pathway
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              Four Simple Steps to Join Roseland
            </h2>
            <p className="text-brand-textMuted mt-4 text-base">
              We have structured our admission process to be swift, straightforward, and supportive for parents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {steps.map((step) => (
              <div key={step.num} className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:border-brand-violet/30 transition-all">
                <div>
                  <span className="font-serif font-bold text-4xl text-brand-yellow block mb-4">
                    {step.num}
                  </span>
                  <h3 className="text-xl font-bold text-brand-textMain mb-3">{step.title}</h3>
                  <p className="text-xs text-brand-textMuted leading-relaxed mb-6">{step.desc}</p>
                </div>
                <Link
                  href={step.href}
                  className="text-xs font-bold text-brand-violet flex items-center gap-1.5 hover:underline"
                >
                  {step.action} <i className="ph-bold ph-arrow-right"></i>
                </Link>
              </div>
            ))}
          </div>

          {/* 2. REQUIRED DOCUMENT CHECKLIST */}
          <div className="bg-brand-violetLight/40 rounded-3xl p-8 sm:p-12 border border-brand-violet/20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Checklist for Parents</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain mt-1 mb-4">
                Required Documents for Enrollment
              </h3>
              <p className="text-sm text-brand-textMuted mb-6 leading-relaxed">
                Please prepare the following documents to attach during online application or submit physically at the administrative desk:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-brand-textMain font-medium">
                <div className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-600 text-lg"></i> Copy of Child's Birth Certificate</div>
                <div className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-600 text-lg"></i> Child's Child Welfare / Weighing Card (for Early Years)</div>
                <div className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-600 text-lg"></i> 2 Passport-sized Photographs</div>
                <div className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-600 text-lg"></i> Previous Terminal Report Card (if transferring)</div>
                <div className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-600 text-lg"></i> Valid National ID of Parent/Guardian (Ghana Card)</div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
              <h4 className="font-bold text-brand-textMain text-base">Ready to start?</h4>
              <p className="text-xs text-brand-textMuted">Applications take under 5 minutes to submit online.</p>
              <Link
                href="/admissions/apply"
                className="w-full py-3.5 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm shadow-md"
              >
                Launch Application Form
              </Link>
              <Link
                href="/admissions/tour"
                className="w-full py-3 bg-brand-bg text-brand-textMain font-bold rounded-xl hover:bg-gray-100 transition-all text-xs"
              >
                Schedule Guided School Visit
              </Link>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
