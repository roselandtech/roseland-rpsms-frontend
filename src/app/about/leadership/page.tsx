import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function LeadershipPage() {
  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Leadership & Faculty"
        title="Guiding Visionaries & Dedicated Educators"
        subtitle="Meet the administrative leadership and experienced teaching professionals shaping the minds of Roseland pupils."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'About Us', href: '/about' },
          { label: 'Leadership & Faculty' }
        ]}
        bgImage="/IMG_1558.JPG.jpeg"
      />

      {/* 1. PROPRIETRESS DESK */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="/Rose-Boateng.jpg"
                  alt="Mrs. Rose Boateng - Proprietress"
                  className="w-full h-[480px] object-cover object-top"
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Founding Message
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-4 leading-tight">
                Mrs. Rose Boateng
              </h2>
              <p className="text-sm font-semibold text-brand-violet mb-6 uppercase tracking-wider">
                Proprietress & Educational Director
              </p>
              <div className="space-y-4 text-brand-textMuted text-base leading-relaxed">
                <p>
                  "Education at Roseland is more than academic instruction; it is a sacred trust. Our calling is to provide a home of discovery where young hearts and minds are nurtured with warmth, disciplined with love, and inspired toward greatness."
                </p>
                <p>
                  "We have intentionally invested in modern technology, high-speed ICT centers, and well-trained subject specialists while preserving Ghanaian cultural virtues of respect, humility, and hard work."
                </p>
                <p>
                  "Whether your child joins us in the gentle care of our Crèche or embarks on their final BECE preparations in JHS 3, they will find an inspiring community that believes unreservedly in their potential."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HEADMASTER'S STATEMENT */}
      <section className="py-20 bg-brand-bg border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1">
              <span className="text-brand-yellow font-bold uppercase tracking-widest text-xs mb-2 block">
                Academic Administration
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-4 leading-tight">
                Mrs. Grace
              </h2>
              <p className="text-sm font-semibold text-yellow-800 mb-6 uppercase tracking-wider">
                Headmistress
              </p>
              <div className="space-y-4 text-brand-textMuted text-base leading-relaxed">
                <p>
                  "Our academic framework harmonizes the Ghana Education Service (GES) curriculum with modern continuous assessment metrics. We track individual student trajectories using regular SBA data, identifying learning gaps early and celebrating every milestone."
                </p>
                <p>
                  "At Roseland, no pupil is left behind. Our small class sizes (1:18 ratio) ensure teachers can offer tailored remedial attention and accelerated challenges for exceptional learners."
                </p>
              </div>
            </div>
            <div className="lg:col-span-5 order-1 lg:order-2">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="/Mrs.%20Grace.jpg"
                  alt="Mrs. Grace - Headmistress"
                  className="w-full h-[480px] object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. HEADS OF DEPARTMENTS & FACULTY */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Departmental Leadership
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              Departmental Heads & Specialists
            </h2>
            <p className="text-brand-textMuted mt-3 text-base">
              Certified educators leading our instructional teams across all tiers of learning.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Lead 1 */}
            <div className="bg-brand-bg rounded-3xl p-6 border border-gray-100 text-center group hover:shadow-xl transition-all">
              <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white shadow-md">
                <img src="https://i.pravatar.cc/300?img=47" alt="Early Childhood Lead" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-bold text-lg text-brand-textMain">Mrs. Evelyn Appiah</h3>
              <p className="text-xs font-semibold text-brand-violet mt-1 uppercase">Head, Early Childhood</p>
              <p className="text-xs text-brand-textMuted mt-3 leading-relaxed">
                B.Ed Early Childhood Education. Specialist in sensory development and play-based phonics.
              </p>
            </div>

            {/* Lead 2 */}
            <div className="bg-brand-bg rounded-3xl p-6 border border-gray-100 text-center group hover:shadow-xl transition-all">
              <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white shadow-md">
                <img src="https://i.pravatar.cc/300?img=12" alt="Primary School Lead" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-bold text-lg text-brand-textMain">Mr. Emmanuel Osei</h3>
              <p className="text-xs font-semibold text-brand-violet mt-1 uppercase">Head, Primary School</p>
              <p className="text-xs text-brand-textMuted mt-3 leading-relaxed">
                B.Sc Mathematics & Primary Pedagogy. Leads STEM integration and numeracy acceleration.
              </p>
            </div>

            {/* Lead 3 */}
            <div className="bg-brand-bg rounded-3xl p-6 border border-gray-100 text-center group hover:shadow-xl transition-all">
              <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white shadow-md">
                <img src="https://i.pravatar.cc/300?img=68" alt="JHS Coordinator" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-bold text-lg text-brand-textMain">Mr. Benjamin Mensah</h3>
              <p className="text-xs font-semibold text-brand-violet mt-1 uppercase">Head, Junior High (JHS)</p>
              <p className="text-xs text-brand-textMuted mt-3 leading-relaxed">
                M.Ed Science Education. Coordinates BECE candidate masterclasses and science practicals.
              </p>
            </div>

            {/* Lead 4 */}
            <div className="bg-brand-bg rounded-3xl p-6 border border-gray-100 text-center group hover:shadow-xl transition-all">
              <div className="w-28 h-28 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white shadow-md">
                <img src="https://i.pravatar.cc/300?img=33" alt="ICT Coordinator" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
              </div>
              <h3 className="font-bold text-lg text-brand-textMain">Ms. Sarah Ansah</h3>
              <p className="text-xs font-semibold text-brand-violet mt-1 uppercase">Director of ICT & CBT</p>
              <p className="text-xs text-brand-textMuted mt-3 leading-relaxed">
                B.Sc Computer Science. Oversees student digital literacy, computer labs, and CBT systems.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
