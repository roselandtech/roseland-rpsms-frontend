import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function AboutPage() {
  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="About Our School"
        title="Nurturing Tomorrow's Leaders with Excellence and Integrity"
        subtitle="Discover the heritage, mission, and guiding principles of The Roseland Preparatory School in the Ga West Municipality, Accra."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'About Us' }
        ]}
        bgImage="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=2000"
      />

      {/* 1. OUR STORY & HERITAGE */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Our Story & Origins
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-6 leading-tight">
                From a Humble Vision to a Model Center of Basic Education
              </h2>
              <p className="text-brand-textMuted leading-relaxed mb-4 text-base">
                The Roseland Preparatory School was founded by <strong className="text-brand-textMain">Mrs. Rose Boateng</strong>, a veteran educator driven by a passion to deliver high-quality, morally grounded, and tech-forward basic education to families in the Ga West Municipality.
              </p>
              <p className="text-brand-textMuted leading-relaxed mb-6 text-base">
                What began with a modest nursery cohort has flourished into a full-cycle basic school comprising Crèche, Nursery, Lower/Upper Primary, and a competitive Junior High School with modern science and ICT computer facilities.
              </p>
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100 text-center">
                <div className="bg-brand-bg p-4 rounded-2xl">
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-violet">400+</p>
                  <p className="text-xs text-brand-textMuted mt-1">Pupils Enrolled</p>
                </div>
                <div className="bg-brand-bg p-4 rounded-2xl">
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-violet">30+</p>
                  <p className="text-xs text-brand-textMuted mt-1">Certified Faculty</p>
                </div>
                <div className="bg-brand-bg p-4 rounded-2xl">
                  <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-violet">100%</p>
                  <p className="text-xs text-brand-textMuted mt-1">GES Compliance</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
                <img
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800"
                  alt="Roseland Classroom Interaction"
                  className="w-full h-[460px] object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-brand-violet text-white p-6 rounded-2xl shadow-xl max-w-xs border-2 border-white hidden sm:block">
                <p className="font-serif font-bold text-lg leading-tight">Motto:</p>
                <p className="text-sm text-brand-yellow font-medium mt-1">"Knowledge, Character, Service"</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. VISION, MISSION & CORE VALUES */}
      <section className="py-20 bg-brand-bg border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {/* Vision */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-eye"></i>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mb-3">Our Vision</h3>
                <p className="text-sm text-brand-textMuted leading-relaxed">
                  To be the benchmark basic educational institution in Greater Accra, recognized for producing disciplined, critical-thinking scholars who excel in academics and contribute constructively to nation-building.
                </p>
              </div>
            </div>

            {/* Mission */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-brand-yellowLight text-yellow-800 flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-target"></i>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mb-3">Our Mission</h3>
                <p className="text-sm text-brand-textMuted leading-relaxed">
                  To deliver a holistic curriculum combining rigorous national standards with digital computing, moral discipline, and creative expression in a secure, nurturing environment.
                </p>
              </div>
            </div>

            {/* Philosophy */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center text-2xl mb-6">
                  <i className="ph-fill ph-compass"></i>
                </div>
                <h3 className="text-xl font-serif font-bold text-brand-textMain mb-3">Core Values</h3>
                <ul className="text-sm text-brand-textMuted space-y-2">
                  <li className="flex items-center gap-2"><strong className="text-brand-textMain">Excellence:</strong> Relentless pursuit of quality.</li>
                  <li className="flex items-center gap-2"><strong className="text-brand-textMain">Integrity:</strong> Honesty and moral fortitude.</li>
                  <li className="flex items-center gap-2"><strong className="text-brand-textMain">Discipline:</strong> Respect, self-regulation, order.</li>
                  <li className="flex items-center gap-2"><strong className="text-brand-textMain">Innovation:</strong> Embracing technology & STEAM.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Sub-navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Link
              href="/about/leadership"
              className="p-6 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-violet hover:shadow-lg transition-all group flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-brand-textMain group-hover:text-brand-violet transition-colors">School Leadership</h4>
                <p className="text-xs text-brand-textMuted mt-1">Meet Proprietress & Headmaster</p>
              </div>
              <i className="ph-bold ph-arrow-right text-brand-violet text-lg group-hover:translate-x-1 transition-transform"></i>
            </Link>

            <Link
              href="/about/campus"
              className="p-6 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-violet hover:shadow-lg transition-all group flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-brand-textMain group-hover:text-brand-violet transition-colors">Campus & Facilities</h4>
                <p className="text-xs text-brand-textMuted mt-1">Labs, library, playground & transport</p>
              </div>
              <i className="ph-bold ph-arrow-right text-brand-violet text-lg group-hover:translate-x-1 transition-transform"></i>
            </Link>

            <Link
              href="/about/accreditation"
              className="p-6 bg-white rounded-2xl border border-gray-200/80 hover:border-brand-violet hover:shadow-lg transition-all group flex items-center justify-between"
            >
              <div>
                <h4 className="font-bold text-brand-textMain group-hover:text-brand-violet transition-colors">Accreditation</h4>
                <p className="text-xs text-brand-textMuted mt-1">GES compliance & standards</p>
              </div>
              <i className="ph-bold ph-arrow-right text-brand-violet text-lg group-hover:translate-x-1 transition-transform"></i>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. SCHOOL ANTHEM */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
            School Spirit
          </span>
          <h2 className="text-3xl font-serif font-bold text-brand-textMain mb-8">
            The Roseland School Anthem
          </h2>
          <div className="bg-brand-violetLight/40 p-8 sm:p-12 rounded-3xl border border-brand-violet/20 relative">
            <i className="ph-fill ph-music-notes text-brand-violet/20 text-6xl absolute top-6 right-6"></i>
            <p className="font-serif text-lg sm:text-xl text-brand-textMain leading-relaxed italic mb-4">
              "Arise, O sons and daughters of Roseland,<br />
              In truth and honor let us stand.<br />
              With books in hand and minds alight,<br />
              We strive for knowledge, pure and bright.<br />
              From Ga West's soil our voices ring,<br />
              To God and country praise we bring!<br />
              Roseland, our pride, our shining star,<br />
              We’ll bear your glory near and far!"
            </p>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-violet mt-6">
              Composed for The Roseland Preparatory School
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
