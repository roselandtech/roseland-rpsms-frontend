import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function EarlyYearsPage() {
  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Early Childhood"
        title="Crèche & Nursery: The Joy of First Discoveries"
        subtitle="A loving, safe, and stimulating haven where toddlers and young learners develop motor skills, early phonics, and social confidence."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Academics', href: '/academics' },
          { label: 'Early Years' }
        ]}
        bgImage="https://images.unsplash.com/photo-1544367567-0f2fcb046ebf?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
                Foundational Years (6 Months – 5 Years)
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain mb-6 leading-tight">
                Gentle Care Rooted in Play-Based Learning
              </h2>
              <p className="text-brand-textMuted leading-relaxed mb-4 text-base">
                The early years represent the most critical window of brain development. At The Roseland Preparatory School, our Early Childhood Department combines affectionate parental care with structured sensory discovery.
              </p>
              <p className="text-brand-textMuted leading-relaxed mb-6 text-base">
                Under the continuous guidance of licensed early-years educators and attentive care attendants, children build emotional resilience, expressive language, and positive curiosity about their world.
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-violetLight/50 p-4 rounded-2xl border border-brand-violet/20">
                  <h4 className="font-bold text-brand-textMain text-sm">Safe & Hygienic</h4>
                  <p className="text-xs text-brand-textMuted mt-1">Sanitized cots, air-conditioned sleep rooms, child-safe furniture.</p>
                </div>
                <div className="bg-brand-yellowLight p-4 rounded-2xl border border-brand-yellow/30">
                  <h4 className="font-bold text-yellow-950 text-sm">Jolly Phonics Foundation</h4>
                  <p className="text-xs text-yellow-900 mt-1">Early letter-sound recognition, storytelling, and speech development.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl overflow-hidden shadow-2xl border-4 border-white">
              <img
                src="https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&q=80&w=800"
                alt="Toddlers Learning and Playing"
                className="w-full h-[450px] object-cover"
              />
            </div>
          </div>

          {/* Class Breakdown */}
          <div className="mb-20">
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-brand-textMain text-center mb-12">
              Our Early Childhood Class Streams
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Crèche */}
              <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-violetLight text-brand-violet flex items-center justify-center text-2xl mb-6">
                    <i className="ph-fill ph-baby"></i>
                  </div>
                  <h4 className="text-xl font-bold text-brand-textMain mb-2">Crèche / Daycare</h4>
                  <p className="text-xs font-semibold text-brand-violet uppercase mb-4">Ages 6 Months – 2 Years</p>
                  <ul className="text-xs text-brand-textMuted space-y-2.5 mb-6">
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Responsive feeding & diapering care</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Tactile and sensory exploration</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Gross motor crawling & walking games</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Calming lullaby rest cycles</li>
                  </ul>
                </div>
                <Link href="/admissions/apply" className="w-full py-2.5 text-center bg-white border border-gray-200 text-xs font-bold text-brand-textMain rounded-xl hover:bg-gray-50">
                  Register for Crèche
                </Link>
              </div>

              {/* Nursery 1 */}
              <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-yellowLight text-yellow-800 flex items-center justify-center text-2xl mb-6">
                    <i className="ph-fill ph-puzzle-piece"></i>
                  </div>
                  <h4 className="text-xl font-bold text-brand-textMain mb-2">Nursery 1</h4>
                  <p className="text-xs font-semibold text-brand-violet uppercase mb-4">Ages 2 – 3 Years</p>
                  <ul className="text-xs text-brand-textMuted space-y-2.5 mb-6">
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Interactive vocabulary & rhymes</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Shape, color & texture recognition</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Potty training & self-care basics</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Group social play and sharing</li>
                  </ul>
                </div>
                <Link href="/admissions/apply" className="w-full py-2.5 text-center bg-white border border-gray-200 text-xs font-bold text-brand-textMain rounded-xl hover:bg-gray-50">
                  Register for Nursery 1
                </Link>
              </div>

              {/* Nursery 2 / KG */}
              <div className="bg-brand-bg p-8 rounded-3xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center text-2xl mb-6">
                    <i className="ph-fill ph-pencil"></i>
                  </div>
                  <h4 className="text-xl font-bold text-brand-textMain mb-2">Nursery 2 / Kindergarten</h4>
                  <p className="text-xs font-semibold text-brand-violet uppercase mb-4">Ages 4 – 5 Years</p>
                  <ul className="text-xs text-brand-textMuted space-y-2.5 mb-6">
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Jolly Phonics blending & reading</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Number tracing & quantitative counting</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Fine motor scissor cutting & drawing</li>
                    <li className="flex items-center gap-2"><i className="ph-fill ph-check-circle text-green-500"></i> Direct preparation for Primary 1</li>
                  </ul>
                </div>
                <Link href="/admissions/apply" className="w-full py-2.5 text-center bg-brand-violet text-xs font-bold text-white rounded-xl hover:bg-brand-violetDark">
                  Register for KG
                </Link>
              </div>
            </div>
          </div>

          {/* Daily Schedule Preview */}
          <div className="bg-gray-900 text-white rounded-3xl p-8 sm:p-12">
            <h3 className="text-2xl font-serif font-bold mb-6 text-brand-yellow">
              A Typical Day in Early Childhood
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                <span className="text-xs font-bold text-brand-yellow block mb-1">07:30 AM – 08:30 AM</span>
                <h5 className="font-bold text-white mb-2">Warm Arrival & Free Play</h5>
                <p className="text-xs text-gray-400">Greeting caregivers, health check, sensory toy stations.</p>
              </div>
              <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                <span className="text-xs font-bold text-brand-yellow block mb-1">08:30 AM – 10:30 AM</span>
                <h5 className="font-bold text-white mb-2">Circle Time & Phonics</h5>
                <p className="text-xs text-gray-400">Sing-alongs, story time, Jolly Phonics letter-sound exercises.</p>
              </div>
              <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                <span className="text-xs font-bold text-brand-yellow block mb-1">10:30 AM – 12:30 PM</span>
                <h5 className="font-bold text-white mb-2">Healthy Snack & Playground</h5>
                <p className="text-xs text-gray-400">Nutritious fruits/meals followed by supervised outdoor play.</p>
              </div>
              <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                <span className="text-xs font-bold text-brand-yellow block mb-1">12:30 PM – 02:30 PM</span>
                <h5 className="font-bold text-white mb-2">Quiet Nap & Story Hour</h5>
                <p className="text-xs text-gray-400">Rejuvenating sleep time and afternoon creative craft activities.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
