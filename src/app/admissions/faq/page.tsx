"use client";

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';
import Link from 'next/link';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What age criteria applies for Crèche, Nursery, and Primary 1?",
      a: "Pupils for Crèche are admitted from 6 months of age. Nursery 1 applicants must be at least 2 to 3 years old by September. Kindergarten (KG) pupils are 4 to 5 years old, while Primary 1 applicants should turn 6 years old during the academic year."
    },
    {
      q: "Is there an entrance assessment for new transfer pupils?",
      a: "Yes. For Primary 1 through JHS 3, candidates sit for a friendly, diagnostic placement test in English Language and Mathematics. This allows our academic team to recommend appropriate class placement and determine if remedial support is needed."
    },
    {
      q: "What are the school operating hours?",
      a: "Campus gates open at 07:00 AM daily. Standard instructional hours run from 08:00 AM to 03:00 PM (Monday to Thursday) and 08:00 AM to 02:00 PM on Fridays. After-school supervised care and extra-curricular clubs operate until 05:00 PM."
    },
    {
      q: "Does The Roseland Preparatory School offer school bus services?",
      a: "Yes! We operate clean, air-conditioned school buses covering major residential corridors within the Ga West Municipality and surrounding communities. Parents can choose two-way or one-way transit options."
    },
    {
      q: "How does the school handle feeding and dietary allergies?",
      a: "Our canteen serves hot, balanced Ghanaian and continental meals prepared under strict sanitary standards. Parents can log food allergies during enrollment; all allergy profiles are tagged directly on the pupil's digital record."
    },
    {
      q: "Can school fees be paid in installments?",
      a: "Yes. We offer a two-part installment plan: 60% upon resumption, and the remaining 40% before the mid-term break. Payments are processed securely via Mobile Money (MoMo) or direct bank transfer."
    },
    {
      q: "How do parents track continuous academic performance and attendance?",
      a: "Every registered family receives access to our Parent Portal. Parents can view real-time morning attendance roll calls, teacher behavioral remarks, continuous SBA scores, and download terminal report cards."
    }
  ];

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Got Questions?"
        title="Frequently Asked Questions"
        subtitle="Find clear answers to common questions about enrollment, curriculum, school bus transport, canteen, and fee policies."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Admissions', href: '/admissions' },
          { label: 'Admissions FAQ' }
        ]}
        bgImage="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="space-y-4 mb-16">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-brand-bg rounded-2xl border border-gray-200/80 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full p-6 text-left font-bold text-brand-textMain flex items-center justify-between gap-4 hover:text-brand-violet transition-colors"
                  >
                    <span className="text-base sm:text-lg font-serif">{faq.q}</span>
                    <i className={`ph ph-caret-down text-lg text-brand-violet shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}></i>
                  </button>

                  {isOpen && (
                    <div className="px-6 pb-6 pt-0 text-sm text-brand-textMuted leading-relaxed border-t border-gray-100 bg-white/50 animate-fade-in">
                      <p className="mt-3">{faq.a}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-8 bg-brand-violetLight/50 rounded-3xl border border-brand-violet/20 text-center">
            <h4 className="text-xl font-serif font-bold text-brand-textMain mb-2">Still Have Questions?</h4>
            <p className="text-xs sm:text-sm text-brand-textMuted mb-6 max-w-md mx-auto">
              Our admissions team is available Monday through Friday to assist you with inquiries.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="px-6 py-3 bg-brand-violet text-white font-bold rounded-xl hover:bg-brand-violetDark text-xs"
              >
                Send Us a Message
              </Link>
              <a
                href="https://wa.me/233243968988"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#1EBE5D] text-xs flex items-center gap-1.5"
              >
                <i className="ph-fill ph-whatsapp-logo text-base"></i> Chat on WhatsApp
              </a>
            </div>
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
