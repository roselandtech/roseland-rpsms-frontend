import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function FeesPage() {
  const feeTiers = [
    {
      level: "Crèche & Nursery",
      tuition: "GHS 750",
      pta: "GHS 50",
      canteen: "GHS 350",
      total: "GHS 1,150",
      notes: "Includes full daytime care, nap supervision, and snack preparation."
    },
    {
      level: "Lower Primary (P1–P3)",
      tuition: "GHS 800",
      pta: "GHS 50",
      canteen: "GHS 350",
      total: "GHS 1,200",
      notes: "Includes ICT computer lab sessions and creative arts materials."
    },
    {
      level: "Upper Primary (P4–P6)",
      tuition: "GHS 850",
      pta: "GHS 50",
      canteen: "GHS 350",
      total: "GHS 1,250",
      notes: "Includes science lab demonstrations and French coaching."
    },
    {
      level: "Junior High School (JHS 1–JHS 3)",
      tuition: "GHS 950",
      pta: "GHS 50",
      canteen: "GHS 350",
      total: "GHS 1,350",
      notes: "Includes CBT mock examination series and lab practical materials."
    }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Financial Clarity"
        title="Transparent Fee Schedule & Payment Modes"
        subtitle="We provide competitive, all-inclusive educational value with flexible termly payment plans via Mobile Money and Bank Deposit."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions', href: '/admissions' },
          { label: 'Tuition & Fees' }
        ]}
        bgImage="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Termly Fee Schedule (2025/2026)
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              All-Inclusive Standard Billing
            </h2>
            <p className="text-brand-textMuted mt-3 text-base">
              Fees are billed termly (3 terms per academic year). Flexible two-installment payment arrangements are available upon request.
            </p>
          </div>

          {/* Fee Cards Table */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {feeTiers.map((tier) => (
              <div key={tier.level} className="bg-brand-bg rounded-3xl p-6 border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:border-brand-violet/30 transition-all">
                <div>
                  <h3 className="font-serif font-bold text-xl text-brand-textMain mb-1">{tier.level}</h3>
                  <p className="text-xs text-brand-textMuted mb-6">{tier.notes}</p>
                  
                  <div className="space-y-3 text-xs mb-6">
                    <div className="flex justify-between pb-2 border-b border-gray-200">
                      <span className="text-brand-textMuted">Tuition Fee</span>
                      <strong className="text-brand-textMain">{tier.tuition}</strong>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-gray-200">
                      <span className="text-brand-textMuted">PTA Dues</span>
                      <strong className="text-brand-textMain">{tier.pta}</strong>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-gray-200">
                      <span className="text-brand-textMuted">Canteen / Feeding</span>
                      <strong className="text-brand-textMain">{tier.canteen}</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Total Per Term</span>
                  <p className="text-2xl font-serif font-bold text-brand-violet mb-4">{tier.total}</p>
                  <Link
                    href="/admissions/apply"
                    className="block w-full py-2.5 text-center bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs transition-colors"
                  >
                    Apply for this Level
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Methods & Policy */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-brand-violetLight/40 p-8 rounded-3xl border border-brand-violet/20">
              <h3 className="text-xl font-serif font-bold text-brand-textMain mb-4 flex items-center gap-2">
                <i className="ph-fill ph-device-mobile-camera text-brand-violet text-2xl"></i>
                Mobile Money (MoMo) & Bank Channels
              </h3>
              <p className="text-xs text-brand-textMuted leading-relaxed mb-6">
                Parents can pay directly from anywhere in Ghana using our verified merchant shortcode or direct bank transfer.
              </p>
              <div className="space-y-3 text-xs text-brand-textMain">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex justify-between items-center">
                  <span><strong>MTN Mobile Money Merchant ID:</strong> 402911</span>
                  <span className="text-brand-violet font-bold">Roseland Prep</span>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex justify-between items-center">
                  <span><strong>GCB Bank Account:</strong> 1421000000000</span>
                  <span className="text-brand-violet font-bold">Ga West Branch</span>
                </div>
              </div>
            </div>

            <div className="bg-brand-yellowLight p-8 rounded-3xl border border-brand-yellow/30">
              <h3 className="text-xl font-serif font-bold text-yellow-950 mb-4 flex items-center gap-2">
                <i className="ph-fill ph-shield-check text-yellow-800 text-2xl"></i>
                Fee Policies & Sibling Discounts
              </h3>
              <ul className="text-xs text-yellow-950 space-y-2.5 leading-relaxed">
                <li className="flex items-center gap-2"><i className="ph-bold ph-check text-yellow-800"></i> <strong>Sibling Rebate:</strong> 5% tuition discount on 3rd child and subsequent siblings.</li>
                <li className="flex items-center gap-2"><i className="ph-bold ph-check text-yellow-800"></i> <strong>Installment Window:</strong> 60% upon resumption, remaining 40% before mid-term.</li>
                <li className="flex items-center gap-2"><i className="ph-bold ph-check text-yellow-800"></i> <strong>Instant Receipting:</strong> Payments reflect within 2 hours on the Parent Portal.</li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
