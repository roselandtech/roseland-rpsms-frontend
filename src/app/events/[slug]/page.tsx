import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      {/* Header Banner */}
      <div className="bg-brand-violet text-white pt-36 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/events"
            className="text-xs font-bold text-brand-yellowLight inline-flex items-center gap-1.5 hover:underline mb-6"
          >
            <i className="ph-bold ph-arrow-left"></i> Back to All Events
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-brand-yellow block mb-2">
            Campus Gathering
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold leading-tight mb-4">
            2026 Annual Speech, Prize Giving & Graduation Ceremony
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-xs text-brand-violetLight">
            <span className="flex items-center gap-1.5"><i className="ph-fill ph-calendar text-brand-yellow"></i> July 23, 2026</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><i className="ph-fill ph-clock text-brand-yellow"></i> 09:00 AM – 01:30 PM</span>
            <span>•</span>
            <span className="flex items-center gap-1.5"><i className="ph-fill ph-map-pin text-brand-yellow"></i> Main School Auditorium</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <section className="py-16 bg-white flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="rounded-3xl overflow-hidden shadow-2xl mb-12 border-4 border-white">
            <img
              src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=1200"
              alt="Roseland Speech Day Celebration"
              className="w-full h-[440px] object-cover"
            />
          </div>

          <div className="prose max-w-none text-brand-textMain text-base sm:text-lg leading-relaxed space-y-6">
            <p className="font-serif text-xl sm:text-2xl text-brand-violet font-semibold italic">
              "Honoring scholarly excellence, creative ingenuity, and the graduating Class of 2026."
            </p>
            <p>
              The Annual Speech and Prize Giving Day stands as the zenith of our academic calendar. Parents, guardians, alumni, and distinguished guests from the Ga West Municipal Education Directorate gather to celebrate the outstanding achievements of our pupils across all academic disciplines, sports, and civic clubs.
            </p>
            
            <h3 className="text-2xl font-serif font-bold text-brand-textMain pt-4">
              Program of Events & Schedule
            </h3>
            
            <div className="not-prose space-y-3 my-6">
              <div className="p-4 bg-brand-bg rounded-2xl border border-gray-100 flex items-start gap-4">
                <span className="text-xs font-bold text-brand-violet bg-white px-3 py-1 rounded-lg border border-gray-200 shrink-0">08:30 AM</span>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Arrival of Parents, Guardians & Guests of Honor</h4>
                  <p className="text-xs text-brand-textMuted">Musical prelude by the Roseland Brass Band & Cultural Troupe.</p>
                </div>
              </div>

              <div className="p-4 bg-brand-bg rounded-2xl border border-gray-100 flex items-start gap-4">
                <span className="text-xs font-bold text-brand-violet bg-white px-3 py-1 rounded-lg border border-gray-200 shrink-0">09:15 AM</span>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Opening Prayer & School Anthem</h4>
                  <p className="text-xs text-brand-textMuted">Welcome address by Proprietress Mrs. Rose Boateng.</p>
                </div>
              </div>

              <div className="p-4 bg-brand-bg rounded-2xl border border-gray-100 flex items-start gap-4">
                <span className="text-xs font-bold text-brand-violet bg-white px-3 py-1 rounded-lg border border-gray-200 shrink-0">10:00 AM</span>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Headmaster's Annual Academic Report</h4>
                  <p className="text-xs text-brand-textMuted">Presentation of BECE performance and infrastructure developments by Mr. Kwame Asamoah.</p>
                </div>
              </div>

              <div className="p-4 bg-brand-bg rounded-2xl border border-gray-100 flex items-start gap-4">
                <span className="text-xs font-bold text-brand-violet bg-white px-3 py-1 rounded-lg border border-gray-200 shrink-0">11:00 AM</span>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Award Presentations & Prize Distribution</h4>
                  <p className="text-xs text-brand-textMuted">Subject distinctions, overall best scholars, and best-behaved pupils.</p>
                </div>
              </div>

              <div className="p-4 bg-brand-bg rounded-2xl border border-gray-100 flex items-start gap-4">
                <span className="text-xs font-bold text-brand-violet bg-white px-3 py-1 rounded-lg border border-gray-200 shrink-0">12:30 PM</span>
                <div>
                  <h4 className="font-bold text-sm text-brand-textMain">Graduation Ceremony for JHS 3 Scholars</h4>
                  <p className="text-xs text-brand-textMuted">Conferment of graduation certificates and class valedictory speech.</p>
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-serif font-bold text-brand-textMain pt-4">
              Guest Attendance & Protocol
            </h3>
            <p>
              Admission to the auditorium is open to all parents, guardians, and invited dignitaries. Parents are kindly requested to be seated by 08:45 AM. Refreshments will be served immediately following the benediction.
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/events"
              className="px-6 py-3 bg-brand-bg hover:bg-gray-200 text-brand-textMain font-bold rounded-xl text-xs flex items-center gap-2"
            >
              <i className="ph-bold ph-arrow-left"></i> View All Events
            </Link>
            <Link
              href="/contact"
              className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs shadow-md"
            >
              Contact Event Committee
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
