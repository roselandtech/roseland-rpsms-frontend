import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function SportsPage() {
  const sports = [
    { title: "Football Academy", desc: "Coached by certified youth trainers, teaching positional discipline, ball control, tactical awareness, and sportsmanship.", icon: "ph-football" },
    { title: "Track & Field Athletics", desc: "Sprint dashes (100m, 200m, 400m), relay coordination, long jump, and endurance pacing across age streams.", icon: "ph-sneaker-move" },
    { title: "Table Tennis & Racket Sports", desc: "Indoor reflex conditioning, hand-eye coordination drills, and termly intra-school tournaments.", icon: "ph-ping-pong" },
    { title: "Volleyball & Netball", desc: "Teamwork coordination, passing agility, blocking mechanics, and friendly inter-school matches.", icon: "ph-volleyball" }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Athletics & Physical Health"
        title="Sports, Fitness & Healthy Competition"
        subtitle="Cultivating physical endurance, team camaraderie, and sportsmanship through disciplined athletic training."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Student Life' },
          { label: 'Sports & Athletics' }
        ]}
        bgImage="https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Physical Education Program
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-6 leading-tight">
                A Sound Mind in a Healthy, Active Body
              </h2>
              <p className="text-brand-textMuted leading-relaxed mb-4 text-base">
                Physical education is an integral component of our weekly timetable. We believe sports instill lifelong habits of physical fitness, emotional resilience under pressure, and gracious teamwork.
              </p>
              <p className="text-brand-textMuted leading-relaxed mb-6 text-base">
                From early childhood motor development to competitive JHS inter-school tournaments across the Ga West Municipality, our athletic program provides avenues for every pupil to discover their athletic prowess.
              </p>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800"
                alt="Students playing sports"
                className="w-full h-[450px] object-cover"
              />
            </div>
          </div>

          {/* Sports Categories */}
          <div className="mb-20">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain text-center mb-12">
              Athletic Disciplines at Roseland
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sports.map((s) => (
                <div key={s.title} className="bg-brand-bg p-6 rounded-3xl border border-gray-100 flex flex-col justify-between hover:shadow-lg transition-all">
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-brand-yellowLight text-yellow-800 flex items-center justify-center text-2xl mb-4">
                      <i className={`ph-fill ${s.icon}`}></i>
                    </div>
                    <h4 className="font-bold text-lg text-brand-textMain mb-2">{s.title}</h4>
                    <p className="text-xs text-brand-textMuted leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inter-House System Banner */}
          <div className="bg-gray-900 text-white rounded-3xl p-8 sm:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-yellow">House System Competition</span>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold mt-1 mb-4 text-white">
                  The Four Roseland Houses
                </h3>
                <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-6">
                  Every enrolled pupil is assigned to one of our four institutional houses upon admission. Houses compete annually in academic quizzes, debate leagues, football cups, and the grand Inter-House Athletics Championship.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-bold">
                  <div className="bg-red-600/30 border border-red-500/40 p-3 rounded-xl text-red-300">Red House</div>
                  <div className="bg-amber-600/30 border border-amber-500/40 p-3 rounded-xl text-amber-300">Yellow House</div>
                  <div className="bg-emerald-600/30 border border-emerald-500/40 p-3 rounded-xl text-emerald-300">Green House</div>
                  <div className="bg-blue-600/30 border border-blue-500/40 p-3 rounded-xl text-blue-300">Blue House</div>
                </div>
              </div>

              <div className="lg:col-span-4 text-center">
                <Link
                  href="/gallery"
                  className="px-6 py-3.5 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 text-xs inline-block shadow-md"
                >
                  View Sports Day Photos
                </Link>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
