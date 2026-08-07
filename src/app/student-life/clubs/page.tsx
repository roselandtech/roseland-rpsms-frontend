import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function ClubsPage() {
  const clubs = [
    {
      name: "Robotics & Coding Club",
      category: "STEAM & Innovation",
      desc: "Pupils learn visual block coding (Scratch), basic robotics assemblies, and computational problem solving in our computer laboratory.",
      icon: "ph-robot",
      tag: "Tech"
    },
    {
      name: "Debate & Public Speaking Society",
      category: "Humanities & Leadership",
      desc: "Fosters eloquence, logical reasoning, and competitive debating on contemporary civic issues and Ghanaian socio-economic development.",
      icon: "ph-microphone-stage",
      tag: "Leadership"
    },
    {
      name: "Young Scientists & Math Olympiad",
      category: "STEM",
      desc: "Fun hands-on experiments, chemical reactions, environmental ecology projects, and regional mathematics challenge preparations.",
      icon: "ph-atom",
      tag: "Science"
    },
    {
      name: "Cadet Corps & Civic Drills",
      category: "Discipline & Civic Duty",
      desc: "Develops parade coordination, physical stamina, leadership hierarchy, and national patriotism for ceremonial events.",
      icon: "ph-shield-star",
      tag: "Discipline"
    },
    {
      name: "French Language & Cultural Club",
      category: "Foreign Languages",
      desc: "Interactive Francophone conversational salons, French drama sketches, cooking vocabulary, and cultural music sessions.",
      icon: "ph-translate",
      tag: "Language"
    },
    {
      name: "Music, Brass Band & Cultural Troupe",
      category: "Performing Arts",
      desc: "Brass instruments, traditional drumming, choral vocal training, and cultural choreography for school festivals.",
      icon: "ph-guitar",
      tag: "Arts"
    }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Co-Curriculars"
        title="Clubs, Societies & STEAM Innovation"
        subtitle="Unlocking passions beyond the textbook through robotics, competitive debate, cadet drills, music, and foreign languages."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Student Life' },
          { label: 'Clubs & STEAM' }
        ]}
        bgImage="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Holistic Student Development
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              Vibrant After-School Societies
            </h2>
            <p className="text-brand-textMuted mt-4 text-base">
              Every Wednesday and Friday afternoon, pupils from Primary 3 to JHS 3 engage in structured club sessions designed to cultivate teamwork, leadership, and diverse talents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {clubs.map((c) => (
              <div key={c.name} className="bg-brand-bg rounded-3xl p-8 border border-gray-100 hover:border-brand-violet/40 hover:shadow-xl transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-2xl group-hover:bg-brand-violet group-hover:text-white transition-colors">
                      <i className={`ph-fill ${c.icon}`}></i>
                    </div>
                    <span className="px-3 py-1 bg-white text-brand-violet text-xs font-bold rounded-full border border-gray-200 uppercase tracking-wider">
                      {c.tag}
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-brand-violet uppercase tracking-wider">{c.category}</span>
                  <h3 className="text-xl font-serif font-bold text-brand-textMain mt-1 mb-3">{c.name}</h3>
                  <p className="text-xs sm:text-sm text-brand-textMuted leading-relaxed">{c.desc}</p>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-200/80 flex items-center justify-between text-xs font-bold text-brand-textMain">
                  <span>Weekly Sessions</span>
                  <span className="text-brand-violet">Wed & Fri 03:15 PM</span>
                </div>
              </div>
            ))}
          </div>

          {/* Call to action */}
          <div className="bg-brand-violet text-white p-8 sm:p-12 rounded-3xl text-center">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold mb-3">Want Your Child to Join a Club?</h3>
            <p className="text-sm text-brand-violetLight/90 max-w-xl mx-auto mb-6">
              Club registrations open at the start of each term and are integrated seamlessly with standard academic timetables.
            </p>
            <Link
              href="/admissions/apply"
              className="px-8 py-3.5 bg-brand-yellow text-yellow-950 font-bold rounded-xl hover:bg-yellow-400 text-xs inline-block shadow-md"
            >
              Enroll Your Child at Roseland
            </Link>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
