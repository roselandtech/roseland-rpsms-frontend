import Link from 'next/link';
import Image from 'next/image';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { RoselandApi } from '@/lib/api';

export const revalidate = 60;

export default async function Home() {
  let schoolName = "The Roseland Preparatory School";
  let rawMotto = "Knowledge & Humility";
  let location = "Kotoku, Accra";
  let email = "info@roselandprep.edu.gh";
  let phone = "+233243968988";
  let mottoStart = "Building a Foundation for";
  let mottoHighlight = "Excellence.";
  
  try {
    const cmsData = await RoselandApi.cms.getLandingContent();
    if (cmsData?.institution) {
      if (cmsData.institution.name) schoolName = cmsData.institution.name;
      if (cmsData.institution.location) location = cmsData.institution.location;
      if (cmsData.institution.email) email = cmsData.institution.email;
      if (cmsData.institution.phone) phone = cmsData.institution.phone;
      if (cmsData.institution.tagline) {
        rawMotto = cmsData.institution.tagline;
        // Split the motto to highlight the last word
        const words = cmsData.institution.tagline.split(' ');
        if (words.length > 1) {
          mottoHighlight = words.pop() + ".";
          mottoStart = words.join(' ');
        } else {
          mottoStart = cmsData.institution.tagline;
          mottoHighlight = "";
        }
      }
    }
  } catch (err) {}

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg overflow-x-hidden min-h-screen flex flex-col">
      <Navbar initialSchoolName={schoolName} initialSchoolMotto={rawMotto} />

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-28 sm:pt-32 pb-20">
        {/* Background Image with Rich Editorial Gradient */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/IMG_3023.JPG.jpeg"
            alt="Students"
            fill
            priority
            sizes="100vw"
            quality={80}
            className="object-cover object-center scale-105 transform-gpu"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-950/95 via-gray-900/80 to-brand-violetDark/60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent"></div>
        </div>

        {/* Decorative Ambient Glow */}
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-brand-violet/25 rounded-full blur-3xl pointer-events-none transform-gpu"></div>
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-brand-violetDark/20 rounded-full blur-3xl pointer-events-none transform-gpu"></div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-start pt-8">
          {/* Admissions Badge (Static, Refined, No Logo, No Blinking) */}
          <div className="inline-flex items-center py-1.5 px-4 rounded-full bg-amber-400/90 backdrop-blur-sm text-slate-950 text-xs font-semibold uppercase tracking-wider shadow-md border border-amber-300/30 mb-6 animate-fade-in">
            2026/2027 Admissions Now Open
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-serif font-bold text-white leading-[1.1] mb-6 max-w-4xl animate-fade-in">
            {mottoStart} {mottoHighlight && <span className="text-amber-400 italic underline decoration-amber-400/40">{mottoHighlight}</span>}
          </h1>

          <p className="text-lg sm:text-xl text-gray-200 mb-10 max-w-2xl font-light leading-relaxed animate-fade-in">
            Welcome to <strong className="text-white font-semibold">{schoolName}</strong>. From Crèche to JHS, we nurture brilliant minds with rigorous GES academics, STEAM innovation, and grounded character in Ga West, Accra.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in">
            <Link
              href="/admissions/apply"
              className="px-8 py-4 text-center bg-amber-400 text-slate-950 font-bold rounded-full hover:bg-amber-300 transition-all shadow-lg shadow-black/30 border border-amber-300/40 flex items-center justify-center gap-2 text-base sm:text-lg group"
            >
              Enroll Your Child
              <i className="ph-bold ph-arrow-right group-hover:translate-x-1 transition-transform"></i>
            </Link>
            <Link
              href="/admissions/tour"
              className="px-8 py-4 text-center bg-white/10 backdrop-blur-md text-white border border-white/30 font-bold rounded-full hover:bg-white/20 transition-all flex items-center justify-center gap-2 text-base sm:text-lg"
            >
              <i className="ph ph-calendar text-xl"></i>
              Book Campus Tour
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-16 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-6 lg:gap-12 w-full max-w-4xl text-white">
            <div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-yellow">100%</p>
              <p className="text-xs text-gray-300 font-medium">BECE Pass Target</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-yellow">Crèche – JHS</p>
              <p className="text-xs text-gray-300 font-medium">Complete Pathway</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-yellow">1:18</p>
              <p className="text-xs text-gray-300 font-medium">Teacher-Pupil Ratio</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-serif font-bold text-brand-yellow">GES</p>
              <p className="text-xs text-gray-300 font-medium">Accredited Standard</p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CORE PILLARS OF EXCELLENCE */}
      <section className="py-20 bg-white relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Why Roseland Preparatory
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain leading-tight">
              An Educational Environment Designed for Child Flourishing
            </h2>
            <p className="text-brand-textMuted mt-4 text-base sm:text-lg">
              We blend national curricular standards with modern computing, disciplined mentorship, and moral integrity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Pillar 1 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-brand-violet/40 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-3xl mb-6 group-hover:bg-brand-violet group-hover:text-white transition-colors">
                <i className="ph-fill ph-certificate"></i>
              </div>
              <h3 className="text-xl font-bold text-brand-textMain mb-3">GES Standard Curriculum</h3>
              <p className="text-sm text-brand-textMuted leading-relaxed mb-4">
                Fully aligned with the Ghana Education Service syllabus, providing rigorous literacy, numeracy, science, and creative arts.
              </p>
              <Link href="/academics" className="text-xs font-bold text-brand-violet flex items-center gap-1 group-hover:underline">
                Explore Curriculum <i className="ph-bold ph-arrow-right"></i>
              </Link>
            </div>

            {/* Pillar 2 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-brand-violet/40 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-brand-yellowLight text-yellow-700 flex items-center justify-center text-3xl mb-6 group-hover:bg-brand-yellow group-hover:text-yellow-950 transition-colors">
                <i className="ph-fill ph-desktop"></i>
              </div>
              <h3 className="text-xl font-bold text-brand-textMain mb-3">STEAM & ICT Lab</h3>
              <p className="text-sm text-brand-textMuted leading-relaxed mb-4">
                Hands-on computing from primary years, digital literacy, coding foundations, and integrated Computer-Based Testing (CBT).
              </p>
              <Link href="/student-life/clubs" className="text-xs font-bold text-brand-violet flex items-center gap-1 group-hover:underline">
                Discover STEAM <i className="ph-bold ph-arrow-right"></i>
              </Link>
            </div>

            {/* Pillar 3 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-brand-violet/40 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-3xl mb-6 group-hover:bg-brand-violet group-hover:text-white transition-colors">
                <i className="ph-fill ph-chalkboard-teacher"></i>
              </div>
              <h3 className="text-xl font-bold text-brand-textMain mb-3">Dedicated Faculty</h3>
              <p className="text-sm text-brand-textMuted leading-relaxed mb-4">
                Passionate, professionally certified educators who monitor individual learning trajectories and provide personalized coaching.
              </p>
              <Link href="/about/leadership" className="text-xs font-bold text-brand-violet flex items-center gap-1 group-hover:underline">
                Meet Teachers <i className="ph-bold ph-arrow-right"></i>
              </Link>
            </div>

            {/* Pillar 4 */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:border-brand-violet/40 hover:shadow-xl hover:-translate-y-1 transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center text-3xl mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
                <i className="ph-fill ph-heart"></i>
              </div>
              <h3 className="text-xl font-bold text-brand-textMain mb-3">Character & Discipline</h3>
              <p className="text-sm text-brand-textMuted leading-relaxed mb-4">
                Nurturing respect, leadership, moral values, and civic duty to raise confident Ghanaian and global citizens.
              </p>
              <Link href="/about" className="text-xs font-bold text-brand-violet flex items-center gap-1 group-hover:underline">
                Our Values <i className="ph-bold ph-arrow-right"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. ACADEMIC DIVISIONS */}
      <section className="py-20 bg-brand-bg border-y border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Academic Pathway
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
                Nurturing Every Stage of Growth
              </h2>
            </div>
            <Link
              href="/academics"
              className="text-sm font-bold text-brand-violet hover:text-brand-violetDark flex items-center gap-1.5"
            >
              View Full Academic Structure <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Division 1: Early Years */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all flex flex-col group">
              <div className="relative h-56 overflow-hidden">
                <Image
                  src="/IMG_2210.jpg"
                  alt="Early Years Crèche & Nursery"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  quality={75}
                  className="object-cover group-hover:scale-105 transition-transform duration-500 transform-gpu"
                />
                <span className="absolute top-4 left-4 bg-brand-yellow text-yellow-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">
                  Crèche & Nursery
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-brand-textMain mb-2">
                    Early Childhood Department
                  </h3>
                  <p className="text-sm text-brand-textMuted leading-relaxed mb-4">
                    Safe, loving play-based environment focusing on sensory motor skills, early phonics, numeracy basics, and social development.
                  </p>
                  <ul className="text-xs text-brand-textMain space-y-2 mb-6">
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Crèche (6 months – 2 years)</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Nursery 1 & Nursery 2</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Dedicated care attendants</li>
                  </ul>
                </div>
                <Link
                  href="/academics/early-years"
                  className="w-full py-3 text-center bg-brand-violetLight text-brand-violet font-bold rounded-xl hover:bg-brand-violet hover:text-white transition-colors text-sm"
                >
                  Explore Early Years
                </Link>
              </div>
            </div>

            {/* Division 2: Primary School */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all flex flex-col group">
              <div className="relative h-56 overflow-hidden">
                <Image
                  src="/IMG_9400.jpg"
                  alt="Primary School Class"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  quality={75}
                  className="object-cover group-hover:scale-105 transition-transform duration-500 transform-gpu"
                />
                <span className="absolute top-4 left-4 bg-brand-violet text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">
                  Primary 1 to 6
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-brand-textMain mb-2">
                    Primary School
                  </h3>
                  <p className="text-sm text-brand-textMuted leading-relaxed mb-4">
                    Strong foundations in literacy, mathematical concepts, integrated science, computing, French, and cultural heritage.
                  </p>
                  <ul className="text-xs text-brand-textMain space-y-2 mb-6">
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Lower Primary (P1 – P3)</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Upper Primary (P4 – P6)</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Continuous assessment (SBA)</li>
                  </ul>
                </div>
                <Link
                  href="/academics/primary"
                  className="w-full py-3 text-center bg-brand-violetLight text-brand-violet font-bold rounded-xl hover:bg-brand-violet hover:text-white transition-colors text-sm"
                >
                  Explore Primary School
                </Link>
              </div>
            </div>

            {/* Division 3: Junior High */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-xl transition-all flex flex-col group">
              <div className="relative h-56 overflow-hidden">
                <Image
                  src="/IMG_3098.JPG.jpeg"
                  alt="Junior High Students"
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  quality={75}
                  className="object-cover group-hover:scale-105 transition-transform duration-500 transform-gpu"
                />
                <span className="absolute top-4 left-4 bg-gray-900 text-brand-yellow text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider z-10">
                  JHS 1 to 3
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-serif font-bold text-brand-textMain mb-2">
                    Junior High School
                  </h3>
                  <p className="text-sm text-brand-textMuted leading-relaxed mb-4">
                    Advanced subject tutoring, lab practicals, leadership skills, and rigorous BECE examination prep with simulated mock trials.
                  </p>
                  <ul className="text-xs text-brand-textMain space-y-2 mb-6">
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> JHS 1 – JHS 3 candidates</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Computer-Based Testing (CBT)</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Senior High School placement prep</li>
                  </ul>
                </div>
                <Link
                  href="/academics/jhs"
                  className="w-full py-3 text-center bg-brand-violetLight text-brand-violet font-bold rounded-xl hover:bg-brand-violet hover:text-white transition-colors text-sm"
                >
                  Explore Junior High
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PROPRIETRESS WELCOME & STORY */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Collage */}
            <div className="lg:col-span-6 relative">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="relative mt-8 sm:mt-12 h-[350px] sm:h-[420px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white group">
                  <Image
                    src="/Rose-Boateng.jpg"
                    alt="Proprietress Mrs. Rose Boateng"
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    quality={75}
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-500 transform-gpu"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 z-10">
                    <p className="text-white font-serif font-bold text-lg leading-tight">Mrs. Rose Boateng</p>
                    <p className="text-brand-yellow text-xs font-bold uppercase tracking-wider mt-1">Proprietress & Founder</p>
                  </div>
                </div>
                
                <div className="relative h-[350px] sm:h-[420px] rounded-3xl overflow-hidden shadow-2xl border-4 border-white mb-8 sm:mb-12 group">
                  <Image
                    src="/Mrs. Grace.jpg"
                    alt="Headmistress Mrs. Grace"
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    quality={75}
                    className="object-cover object-top group-hover:scale-105 transition-transform duration-500 transform-gpu"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-5 z-10">
                    <p className="text-white font-serif font-bold text-lg leading-tight">Mrs. Grace Nyanko Boateng</p>
                    <p className="text-brand-yellow text-xs font-bold uppercase tracking-wider mt-1">Headmistress</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative Content */}
            <div className="lg:col-span-6 lg:pl-8">
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Message from Leadership
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-6 leading-tight">
                "Every Child Possesses the Spark to Achieve Greatness."
              </h2>
              <p className="text-brand-textMuted text-base sm:text-lg leading-relaxed mb-6">
                When we established The Roseland Preparatory School in the Ga West Municipality, our conviction was simple: give every child a loving, disciplined, and intellectually stimulating environment, and they will grow into leaders who shape Ghana and the world.
              </p>
              <p className="text-brand-textMuted text-base sm:text-lg leading-relaxed mb-8">
                Today, our vibrant campus is home to curious toddlers in crèche, enthusiastic primary learners, and determined JHS scholars preparing for outstanding BECE achievements. We invite you to join our growing Roseland family.
              </p>
              
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/about/leadership"
                  className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark transition-colors shadow-md shadow-brand-violet/20 flex items-center gap-2 text-sm"
                >
                  Read Full Leadership Message <i className="ph-bold ph-arrow-right"></i>
                </Link>
                <Link
                  href="/about/campus"
                  className="px-6 py-3 bg-gray-50 border border-gray-200 text-brand-textMain font-bold rounded-xl hover:bg-gray-100 transition-colors text-sm"
                >
                  Tour Our Campus
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CAMPUS FACILITIES SHOWCASE */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-brand-yellow font-bold uppercase tracking-widest text-xs mb-2 block">
                Modern Infrastructure
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white">
                World-Class Learning Facilities
              </h2>
            </div>
            <Link
              href="/about/campus"
              className="text-sm font-bold text-brand-yellow hover:underline flex items-center gap-1.5"
            >
              View All Campus Facilities <i className="ph-bold ph-arrow-right"></i>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800/80 rounded-2xl overflow-hidden border border-gray-700 hover:border-brand-yellow/60 transition-all group">
              <div className="relative w-full h-44 overflow-hidden">
                <Image
                  src="/IMG_2537.jpg"
                  alt="Modern Computer Lab"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  quality={75}
                  className="object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-white mb-1">ICT Computer Lab</h3>
                <p className="text-xs text-gray-400 leading-relaxed">High-speed networked PCs for coding classes and CBT testing sessions.</p>
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-2xl overflow-hidden border border-gray-700 hover:border-brand-yellow/60 transition-all group">
              <div className="relative w-full h-44 overflow-hidden">
                <Image
                  src="/IMG_9165.jpg"
                  alt="Integrated Science Lab"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  quality={75}
                  className="object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-white mb-1">Science Laboratory</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Fully equipped apparatus for practical biology, physics, and chemistry experiments.</p>
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-2xl overflow-hidden border border-gray-700 hover:border-brand-yellow/60 transition-all group">
              <div className="relative w-full h-44 overflow-hidden">
                <Image
                  src="/IMG_9458.jpg"
                  alt="Well-Stocked Library"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  quality={75}
                  className="object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-white mb-1">Library & Resource Hub</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Over 3,000 literature, reference books, and quiet reading study spaces.</p>
              </div>
            </div>

            <div className="bg-gray-800/80 rounded-2xl overflow-hidden border border-gray-700 hover:border-brand-yellow/60 transition-all group">
              <div className="relative w-full h-44 overflow-hidden">
                <Image
                  src="/IMG_9373.jpg"
                  alt="Early Years Play Area"
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  quality={75}
                  className="object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu"
                />
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-white mb-1">Playground & Recreation</h3>
                <p className="text-xs text-gray-400 leading-relaxed">Safe outdoor synthetic play turf, swing sets, and athletic sports field.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS & PARENT VOICES */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Parent Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              Trusted by Families in Ga West
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex text-brand-yellow text-lg mb-4">
                  <i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i>
                </div>
                <p className="text-brand-textMain text-sm sm:text-base leading-relaxed italic mb-6">
                  "My son David joined Roseland in Primary 2. His reading confidence and arithmetic mastery accelerated tremendously within two terms. The parent portal also keeps me informed daily."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <div className="w-10 h-10 rounded-full bg-brand-violet text-white flex items-center justify-center font-bold text-sm">KM</div>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Mr. Kwabena Mensah</h4>
                  <p className="text-xs text-brand-textMuted">Parent of Primary 4 Pupil</p>
                </div>
              </div>
            </div>

            <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex text-brand-yellow text-lg mb-4">
                  <i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i>
                </div>
                <p className="text-brand-textMain text-sm sm:text-base leading-relaxed italic mb-6">
                  "The early childhood teachers in the Crèche are remarkably caring. As a working mother, having complete peace of mind about my toddler's hygiene and safety is priceless."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <div className="w-10 h-10 rounded-full bg-brand-yellow text-yellow-950 flex items-center justify-center font-bold text-sm">GO</div>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Mrs. Grace Nyanko Boateng</h4>
                  <p className="text-xs text-brand-textMuted">Parent of Nursery 1 Pupil</p>
                </div>
              </div>
            </div>

            <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex text-brand-yellow text-lg mb-4">
                  <i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i><i className="ph-fill ph-star"></i>
                </div>
                <p className="text-brand-textMain text-sm sm:text-base leading-relaxed italic mb-6">
                  "The JHS mock series and CBT quiz platform prepared my daughter for her BECE without anxiety. She passed with flying colors and gained admission into her first-choice Senior High School."
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold text-sm">DA</div>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Dr. Alhassan</h4>
                  <p className="text-xs text-brand-textMuted">JHS Graduate Parent</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. UNIFIED ADMISSIONS CALL-TO-ACTION */}
      <section className="py-20 bg-gradient-to-r from-brand-violetDark via-brand-violet to-brand-violetDark text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 bg-white rounded-3xl p-2 shadow-2xl flex items-center justify-center border-2 border-brand-yellow/50 relative overflow-hidden">
            <Image src="/logo.png" alt="The Roseland Preparatory School Crest" width={64} height={64} className="w-full h-full object-contain" />
          </div>
          <span className="py-1.5 px-4 rounded-full bg-amber-400 text-slate-950 text-xs font-semibold uppercase tracking-wider mb-6 inline-block shadow-md border border-amber-300/30">
            Take the Next Step
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold mb-6 leading-tight">
            Give Your Child the Roseland Advantage Today
          </h2>
          <p className="text-lg text-brand-violetLight/90 mb-10 max-w-2xl mx-auto font-light">
            Admissions for the 2026/2027 academic session are ongoing. Limited spaces available across Crèche, Nursery, Primary, and Junior High levels.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/admissions/apply"
              className="px-8 py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-full transition-all shadow-lg shadow-black/25 border border-amber-300/40 text-base"
            >
              Start Online Application
            </Link>
            <Link
              href="/contact"
              className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/30 font-bold rounded-full hover:bg-white/20 transition-all text-base"
            >
              Contact Admissions Office
            </Link>
          </div>
        </div>
      </section>

      <Footer
        initialSchoolName={schoolName}
        initialMotto={rawMotto}
        initialLocation={location}
        initialEmail={email}
        initialPhone={phone}
      />
    </div>
  );
}
