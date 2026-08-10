import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function JHSPage() {
  const beceSubjects = [
    { code: "ENG", name: "English Language", desc: "Essay writing, summary skills, grammatical structures, and literary comprehension." },
    { code: "MATH", name: "Mathematics", desc: "Algebra, plane geometry, trigonometry, statistics, and mental quantitative agility." },
    { code: "SCI", name: "Integrated Science", desc: "Practical biology, physics, chemistry, agricultural science, and lab experiments." },
    { code: "SOC", name: "Social Studies", desc: "Ghanaian governance, economic development, African heritage, and civic engagement." },
    { code: "COMP", name: "Computing / ICT", desc: "Algorithms, networking, spreadsheet analysis, digital literacy, and CBT mastery." },
    { code: "CAD", name: "Career Technology & Creative Arts", desc: "Technical drawing, materials science, design thinking, and vocational arts." },
    { code: "RME", name: "Religious & Moral Education", desc: "Comparative religion, ethics, family life, and character development." },
    { code: "FRN", name: "French Language", desc: "Intermediate reading, oral discourse, translation, and written composition." },
    { code: "GHA", name: "Ghanaian Language & Culture", desc: "Customary rites, proverbs, oral literature, and grammatical analysis." }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Junior High School (JHS 1–JHS 3)"
        title="Rigorous Academics & Proven BECE Success"
        subtitle="Preparing young scholars with analytical rigor, science laboratory mastery, and computer-based examination confidence for Ghana's top Senior High Schools."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Academics', href: '/academics' },
          { label: 'Junior High School' }
        ]}
        bgImage="/IMG_3098.JPG.jpeg"
      />

      {/* 1. JHS PHILOSOPHY & BECE MASTERY */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Pre-Secondary Academic Excellence
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-6 leading-tight">
                Empowering Confident Scholars for the BECE & Beyond
              </h2>
              <p className="text-brand-textMuted leading-relaxed mb-4 text-base">
                The Junior High School department at The Roseland Preparatory School delivers an intensive academic regimen led by subject-matter specialists.
              </p>
              <p className="text-brand-textMuted leading-relaxed mb-6 text-base">
                From JHS 1, pupils engage in active laboratory work, bi-weekly CBT speed quizzes, structured debate tournaments, and comprehensive past-question workshops that cultivate deep conceptual understanding.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-violetLight text-brand-violet flex items-center justify-center font-bold text-sm shrink-0">1</div>
                  <p className="text-sm text-brand-textMain font-medium"><strong>Targeted Mock Series:</strong> 5 standardized mock examinations before the final BECE.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-violetLight text-brand-violet flex items-center justify-center font-bold text-sm shrink-0">2</div>
                  <p className="text-sm text-brand-textMain font-medium"><strong>Digital CBT System:</strong> Direct preparation using our in-house Computer-Based Testing engine.</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-violetLight text-brand-violet flex items-center justify-center font-bold text-sm shrink-0">3</div>
                  <p className="text-sm text-brand-textMain font-medium"><strong>SHS Placement Counseling:</strong> Individual guidance for CSSPS school selection.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="/IMG_3008.JPG.jpeg"
                alt="JHS Students studying together"
                className="w-full h-[450px] object-cover"
              />
            </div>
          </div>

          {/* 2. BECE SUBJECTS */}
          <div className="mb-20">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Curriculum Spectrum
              </span>
              <h3 className="text-3xl font-serif font-bold text-brand-textMain">
                JHS Academic Disciplines
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {beceSubjects.map((sub) => (
                <div key={sub.name} className="p-6 rounded-2xl bg-brand-bg border border-gray-100 hover:border-brand-violet/40 hover:shadow-lg transition-all group">
                  <span className="text-xs font-bold text-brand-violet bg-brand-violetLight px-2.5 py-1 rounded-md uppercase tracking-wider inline-block mb-3">
                    {sub.code}
                  </span>
                  <h4 className="font-bold text-brand-textMain mb-2">{sub.name}</h4>
                  <p className="text-xs text-brand-textMuted leading-relaxed">{sub.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CBT Engine Spotlight */}
          <div className="bg-gray-900 text-white rounded-3xl p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-yellow">Digital Assessment Platform</span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold mt-2 mb-4 text-white">
                Integrated Computer-Based Testing (CBT)
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                Roseland JHS pupils benefit from our proprietary CBT examination platform. Candidates take weekly timed quizzes with instant result analytics, enabling subject teachers to immediately pinpoint and resolve knowledge gaps.
              </p>
              <Link
                href="/cbt"
                className="px-6 py-3 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 transition-all text-sm inline-flex items-center gap-2 shadow-lg"
              >
                <i className="ph-bold ph-desktop"></i> Try CBT Assessment Demo
              </Link>
            </div>
            <div className="lg:col-span-4 bg-gray-800 p-6 rounded-2xl border border-gray-700 text-center">
              <p className="text-4xl font-serif font-bold text-brand-yellow">100%</p>
              <p className="text-xs text-gray-300 uppercase tracking-wider mt-1">First-Choice SHS Placement</p>
              <div className="h-px bg-gray-700 my-4"></div>
              <p className="text-xs text-gray-400">Achimota, PRESEC, Mfantsipim, Wesley Girls, St. Roses & more.</p>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
