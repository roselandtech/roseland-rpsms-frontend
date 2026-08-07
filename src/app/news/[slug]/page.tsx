import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      {/* Article Header */}
      <div className="bg-brand-violet text-white pt-36 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/news"
            className="text-xs font-bold text-brand-yellowLight inline-flex items-center gap-1.5 hover:underline mb-6"
          >
            <i className="ph-bold ph-arrow-left"></i> Back to News & Announcements
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-yellow block mb-2">
            School Bulletin
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold leading-tight mb-4">
            Roseland Celebrates Outstanding Academic & Co-Curricular Strides
          </h1>
          <div className="flex items-center gap-4 text-xs text-brand-violetLight">
            <span>Published: February 2026</span>
            <span>•</span>
            <span>By RPS Editorial Board</span>
          </div>
        </div>
      </div>

      {/* Article Body */}
      <section className="py-16 bg-white flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl overflow-hidden shadow-2xl mb-12 border-4 border-white">
            <img
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200"
              alt="Roseland Academic Assembly"
              className="w-full h-[450px] object-cover"
            />
          </div>

          <div className="prose max-w-none text-brand-textMain text-base sm:text-lg leading-relaxed space-y-6">
            <p className="font-serif text-xl sm:text-2xl text-brand-violet font-semibold italic">
              "Every milestone achieved at Roseland is a reflection of dedicated teaching, pupil discipline, and the steadfast partnership of our parent community."
            </p>
            <p>
              The Roseland Preparatory School continues to distinguish itself as a center of educational brilliance in the Ga West Municipality. Through the diligent application of the Ghana Education Service standards coupled with modern Computer-Based Testing systems, our scholars consistently achieve top percentile ratings.
            </p>
            <h3 className="text-2xl font-serif font-bold text-brand-textMain pt-4">
              Continuous Assessment and STEM Expansion
            </h3>
            <p>
              With our newly expanded ICT computer lab and fully equipped integrated science room, pupils in both Primary and JHS cohorts receive direct hands-on training. Weekly practicals have transformed theoretical lessons into tangible inventions, sparking immense enthusiasm among learners.
            </p>
            <p>
              Management extends its warmest gratitude to our faculty, PTA executive committee, and alumni for their unwavering commitment to the Roseland vision.
            </p>
          </div>

          {/* Bottom Share & Return */}
          <div className="mt-14 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/news"
              className="px-6 py-3 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <i className="ph-bold ph-arrow-left"></i> Return to All News
            </Link>
            <Link
              href="/admissions/apply"
              className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs"
            >
              Enroll Your Ward Today
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
