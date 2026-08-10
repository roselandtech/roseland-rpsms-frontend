import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function AccreditationPage() {
  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Accreditation & Standards"
        title="Certified Academic Quality You Can Trust"
        subtitle="The Roseland Preparatory School operates in strict compliance with the Ghana Education Service (GES) and National Council for Curriculum and Assessment (NaCCA) guidelines."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'About Us', href: '/about' },
          { label: 'Accreditation' }
        ]}
        bgImage="/IMG_9427.jpg"
      />

      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Official Registry Badge */}
          <div className="bg-brand-violetLight/50 p-8 sm:p-10 rounded-3xl border border-brand-violet/20 mb-16 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-brand-violet text-white flex items-center justify-center text-3xl shadow-lg shrink-0">
                <i className="ph-fill ph-seal-check"></i>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-violet">Official GES Accreditation</span>
                <h3 className="text-2xl font-serif font-bold text-brand-textMain">RPS-GES-4029</h3>
                <p className="text-xs text-brand-textMuted mt-0.5">Ga West Municipal Education Directorate • Accra, Ghana</p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="px-4 py-2 bg-green-100 text-green-800 text-xs font-bold rounded-full border border-green-300 uppercase tracking-wider inline-flex items-center">
                Active & Certified
              </span>
            </div>
          </div>

          {/* Key Compliance Pillars */}
          <div className="space-y-12">
            <div>
              <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-4 flex items-center gap-3">
                <i className="ph-fill ph-check-circle text-brand-violet text-2xl"></i>
                Ghana Education Service (GES) Standards
              </h3>
              <p className="text-brand-textMuted text-base leading-relaxed mb-4">
                Our institution strictly adopts the national standards-based curriculum prescribed by the National Council for Curriculum and Assessment (NaCCA). All subject areas—including Mathematics, Integrated Science, Computing, Creative Arts & Design, Ghanaian Language, and Social Studies—follow approved scheme timelines.
              </p>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-4 flex items-center gap-3">
                <i className="ph-fill ph-check-circle text-brand-violet text-2xl"></i>
                WAEC BECE Examination Center Preparation
              </h3>
              <p className="text-brand-textMuted text-base leading-relaxed mb-4">
                Our Junior High School department maintains a rigorous candidate preparation protocol aligned with West African Examinations Council (WAEC) guidelines. Students undergo standardized mock testing, continuous SBA tracking (30% internal assessment submission), and Computer-Based Testing familiarization.
              </p>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-4 flex items-center gap-3">
                <i className="ph-fill ph-check-circle text-brand-violet text-2xl"></i>
                Teacher Certification & Continuous Professional Development (CPD)
              </h3>
              <p className="text-brand-textMuted text-base leading-relaxed mb-4">
                100% of our teaching staff are licensed educators or university graduates in educational pedagogies. Faculty participate in termly National Teaching Council (NTC) accredited workshops, pedagogical training, and child protection seminars.
              </p>
            </div>

            <div className="pt-8 border-t border-gray-100">
              <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-4 flex items-center gap-3">
                <i className="ph-fill ph-check-circle text-brand-violet text-2xl"></i>
                Health, Safety & Child Safeguarding Policy
              </h3>
              <p className="text-brand-textMuted text-base leading-relaxed mb-4">
                The safety of every child is paramount. Roseland enforces strict campus perimeter security, background checks for all personnel, safe bus transit monitoring, and a fully compliant food sanitation protocol certified by local health authorities.
              </p>
            </div>
          </div>

          <div className="mt-16 p-8 bg-gray-50 rounded-3xl border border-gray-200 text-center">
            <h4 className="font-bold text-lg text-brand-textMain mb-2">Have Questions on School Accreditation?</h4>
            <p className="text-sm text-brand-textMuted mb-6 max-w-md mx-auto">
              Our administrative team is happy to provide official verification documents or discuss our academic benchmarks.
            </p>
            <Link
              href="/contact"
              className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-colors text-sm inline-flex items-center gap-2"
            >
              Contact Administration <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
