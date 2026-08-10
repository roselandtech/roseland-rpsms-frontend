import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function ServicesPage() {
  const weeklyMenu = [
    { day: "Monday", breakfast: "Warm Oat Porridge & Milk Bread", lunch: "Jollof Rice with Grilled Chicken & Coleslaw" },
    { day: "Tuesday", breakfast: "Hausa Koko & Bean Cakes (Koose)", lunch: "Waakye with Fried Fish, Spaghetti & Shito" },
    { day: "Wednesday", breakfast: "Milo Beverage, Boiled Egg & Toast", lunch: "Yam Pottage (Asaro) with Fresh Vegetables & Fish" },
    { day: "Thursday", breakfast: "Rice Porridge with Fresh Milk", lunch: "Fried Rice with Chicken Fillet & Vegetable Salad" },
    { day: "Friday", breakfast: "Tom Brown Cereal with Wheat Rolls", lunch: "Banku with Okro Soup & Steamed Fish" }
  ];

  const busRoutes = [
    { route: "Route A (Amasaman – Pokuase Corridor)", time: "06:30 AM Pickup / 03:45 PM Drop-off", areas: "Amasaman Station, Pokuase Interchange, Fise, Katapor" },
    { route: "Route B (Ofankor – Barrier – Tantra)", time: "06:20 AM Pickup / 04:00 PM Drop-off", areas: "Ofankor Barrier, Mile 7, Tantra Hill, ACP Estate" },
    { route: "Route C (Kuntunse – Medie Axis)", time: "06:40 AM Pickup / 03:30 PM Drop-off", areas: "Satellite Junction, Kuntunse Peace Village, Medie" }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Daily Logistics"
        title="Canteen Nutrition & School Bus Fleet"
        subtitle="Wholesome meal programs and dependable, safe bus transit covering key residential hubs in the Ga West Municipality."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Student Life' },
          { label: 'Canteen & Bus Services' }
        ]}
        bgImage="/IMG_2320.jpg"
      />

      {/* 1. CANTEEN NUTRITION MENU */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              School Nutrition Program
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              Freshly Prepared Daily Meals
            </h2>
            <p className="text-brand-textMuted mt-4 text-base">
              Cooked under strict food safety and hygiene controls in our modern institutional kitchen.
            </p>
          </div>

          <div className="bg-brand-bg rounded-3xl p-6 sm:p-10 border border-gray-100 mb-20">
            <div className="grid grid-cols-1 divide-y divide-gray-200">
              {weeklyMenu.map((item) => (
                <div key={item.day} className="py-5 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-3">
                    <span className="text-sm font-bold text-brand-violet bg-white px-3 py-1.5 rounded-xl border border-gray-200 inline-block shadow-sm">
                      {item.day}
                    </span>
                  </div>
                  <div className="sm:col-span-4">
                    <span className="text-xs text-brand-textMuted block font-medium">Morning Breakfast (08:00 AM)</span>
                    <p className="text-sm font-bold text-brand-textMain mt-0.5">{item.breakfast}</p>
                  </div>
                  <div className="sm:col-span-5">
                    <span className="text-xs text-brand-textMuted block font-medium">Nutritious Hot Lunch (12:00 PM)</span>
                    <p className="text-sm font-bold text-yellow-950 mt-0.5">{item.lunch}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. SCHOOL BUS TRANSIT FLEET */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-violet font-bold uppercase tracking-widest text-xs mb-2 block">
              Safe Daily Commute
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-brand-textMain">
              School Bus Transit Routes
            </h2>
            <p className="text-brand-textMuted mt-4 text-base">
              Our bus drivers and transit attendants ensure prompt and secure home-to-school journeys every day.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {busRoutes.map((b) => (
              <div key={b.route} className="p-8 rounded-3xl bg-brand-bg border border-gray-100 flex flex-col justify-between hover:shadow-xl hover:border-brand-violet/30 transition-all">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-yellowLight text-yellow-800 flex items-center justify-center text-2xl mb-4">
                    <i className="ph-fill ph-bus"></i>
                  </div>
                  <h4 className="font-bold text-lg text-brand-textMain mb-2">{b.route}</h4>
                  <p className="text-xs font-semibold text-brand-violet mb-4">{b.time}</p>
                  <p className="text-xs text-brand-textMuted leading-relaxed">
                    <strong className="text-brand-textMain">Key Stops:</strong> {b.areas}
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-gray-200">
                  <Link
                    href="/admissions/apply"
                    className="text-xs font-bold text-brand-violet flex items-center gap-1.5 hover:underline"
                  >
                    Subscribe to Bus Route <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
