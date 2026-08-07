import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function WelfarePage() {
  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Pastoral Care"
        title="Student Welfare, Health & Child Safeguarding"
        subtitle="Ensuring every pupil thrives in a secure, emotionally supportive, and medically attended campus environment."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Student Life' },
          { label: 'Welfare & Health' }
        ]}
        bgImage="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Column 1 */}
            <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-first-aid"></i>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mb-3">Resident Medical Sick Bay</h3>
                <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
                  Our on-campus infirmary is managed by a licensed resident nurse during all operating hours. We handle rapid first-aid response, vital checks, fever monitoring, and prompt parental notification for medical incidents.
                </p>
              </div>
            </div>

            {/* Column 2 */}
            <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-heart-straight"></i>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mb-3">Guidance & Counseling</h3>
                <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
                  Professional emotional and pastoral guidance for pupils navigating academic anxiety, behavioral adjustment, peer relationships, and pre-adolescent developmental changes.
                </p>
              </div>
            </div>

            {/* Column 3 */}
            <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-shield-check"></i>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mb-3">Child Safeguarding Code</h3>
                <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">
                  Strict zero-tolerance policy regarding physical intimidation or verbal bullying. All staff undergo background vetting, and visitor access to instructional zones is strictly regulated.
                </p>
              </div>
            </div>
          </div>

          {/* Parental Health Protocol */}
          <div className="bg-brand-violetLight/40 p-8 sm:p-12 rounded-3xl border border-brand-violet/20">
            <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-4">
              Health Record Integration via Parent Portal
            </h3>
            <p className="text-sm text-brand-textMuted leading-relaxed mb-6 max-w-3xl">
              Parents can record chronic conditions (such as asthma, sickle cell status, or dietary allergies) during enrollment. These alerts automatically appear in teachers' daily cockpits to guarantee immediate care and avoidance of allergy triggers.
            </p>
            <Link
              href="/parent"
              className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs inline-flex items-center gap-2 shadow-sm"
            >
              <i className="ph ph-user-circle text-base"></i> Access Parent Portal
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
