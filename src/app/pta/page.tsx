import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function PTAPage() {
  const executives = [
    { name: "Ing. Samuel Darko", role: "PTA Chairman", phone: "+233 24 100 0001", avatar: "https://i.pravatar.cc/300?img=60" },
    { name: "Mrs. Cynthia Donkor", role: "PTA Vice Chairperson", phone: "+233 24 100 0002", avatar: "https://i.pravatar.cc/300?img=45" },
    { name: "Mr. Ebenezer Armah", role: "Secretary & Head of Welfare", phone: "+233 24 100 0003", avatar: "https://i.pravatar.cc/300?img=53" },
    { name: "Mrs. Anita Kusi", role: "Financial Secretary / Treasurer", phone: "+233 24 100 0004", avatar: "https://i.pravatar.cc/300?img=32" }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Parent Community"
        title="Parent-Teacher Association (PTA)"
        subtitle="A collaborative partnership fostering student welfare, infrastructure development, and transparent institutional dialogue."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'PTA Community' }
        ]}
        bgImage="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 1. PTA MISSION */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Partners in Education
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-6 leading-tight">
                Strengthening the Bridge Between Home & School
              </h2>
              <p className="text-brand-textMuted leading-relaxed mb-4 text-base">
                The Roseland Parent-Teacher Association serves as the democratic voice of our parents and guardians. We work in direct synergy with School Management to evaluate school policies, support infrastructural advancements, and champion child protection.
              </p>
              <p className="text-brand-textMuted leading-relaxed mb-6 text-base">
                General PTA assemblies are held once every term, providing an open forum for questions, developmental proposals, and direct feedback with faculty.
              </p>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800"
                alt="PTA Conference Session"
                className="w-full h-[400px] object-cover"
              />
            </div>
          </div>

          {/* 2. PTA EXECUTIVE COMMITTEE */}
          <div className="mb-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Leadership
              </span>
              <h3 className="text-3xl font-serif font-bold text-brand-textMain">
                PTA Executive Committee (2025–2027)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {executives.map((exec) => (
                <div key={exec.name} className="bg-brand-bg rounded-3xl p-6 border border-gray-100 text-center hover:shadow-lg transition-all">
                  <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white shadow-md">
                    <img src={exec.avatar} alt={exec.name} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="font-bold text-base text-brand-textMain">{exec.name}</h4>
                  <p className="text-xs font-semibold text-brand-violet mt-1 uppercase">{exec.role}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. PTA INITIATIVES & RESOLUTIONS */}
          <div className="bg-brand-violetLight/40 rounded-3xl p-8 sm:p-12 border border-brand-violet/20 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <h3 className="text-2xl font-serif font-bold text-brand-textMain mb-3">
                Key 2025/2026 PTA Developmental Projects
              </h3>
              <ul className="space-y-3 text-xs sm:text-sm text-brand-textMuted">
                <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-brand-violet text-lg"></i> Funding solar energy backup for the ICT and Science computer labs.</li>
                <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-brand-violet text-lg"></i> Procurement of 1,000 new library books for the Lower Primary reading commons.</li>
                <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-brand-violet text-lg"></i> Installation of padded safety flooring in the Early Childhood nursery playground.</li>
              </ul>
            </div>
            <div className="lg:col-span-4 text-center">
              <Link
                href="/contact"
                className="px-6 py-3.5 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs inline-block shadow-md"
              >
                Contact PTA Secretariat
              </Link>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
