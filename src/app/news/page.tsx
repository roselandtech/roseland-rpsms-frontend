"use client";

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function NewsPage() {
  const [selectedCat, setSelectedCat] = useState('all');

  const articles = [
    {
      slug: "roseland-100-percent-bece-distinction-2025",
      title: "Roseland Achieves 100% Distinction Record in 2025 BECE Results",
      category: "Academic",
      date: "October 18, 2025",
      snippet: "Our graduating JHS class recorded stellar Single-Digit aggregates across all subject areas, with over 90% securing their first-choice Senior High School placements.",
      img: "/IMG_9414.jpg"
    },
    {
      slug: "new-high-speed-cbt-computer-lab-commissioned",
      title: "State-of-the-Art CBT Computer Lab Commissioned by Management",
      category: "Infrastructure",
      date: "November 04, 2025",
      snippet: "Equipped with 40 new networked workstations and automated exam testing engines, the new center elevates pupils' digital literacy and ICT preparedness.",
      img: "/IMG_2537.jpg"
    },
    {
      slug: "inter-house-athletics-championship-2026-red-house",
      title: "Red House Clinches 2026 Annual Inter-House Athletics Trophy",
      category: "Sports",
      date: "February 28, 2026",
      snippet: "A thrilling day of sprint relays, tug of war, and gymnastics culminated in Red House lifting the championship cup amidst jubilation.",
      img: "/IMG_7392.PNG"
    },
    {
      slug: "term-2-pta-general-meeting-resolutions",
      title: "Term 2 PTA General Meeting Approves Modern Science Lab Expansion",
      category: "PTA",
      date: "January 24, 2026",
      snippet: "Parents and school executives met to review student welfare initiatives and greenlit the funding for new digital optical microscopes.",
      img: "/IMG_3023.JPG.jpeg"
    }
  ];

  const filtered = selectedCat === 'all'
    ? articles
    : articles.filter(a => a.category.toLowerCase() === selectedCat.toLowerCase());

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="News & Events"
        title="Roseland Chronicles & Announcements"
        subtitle="Stay updated with our latest academic milestones, school celebrations, sports victories, and administrative news."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'News & Announcements' }
        ]}
        bgImage="/IMG_2191.jpg"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Category Filter Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-14">
            {['all', 'Academic', 'Infrastructure', 'Sports', 'PTA'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  selectedCat.toLowerCase() === cat.toLowerCase()
                    ? 'bg-brand-violet text-white shadow-md'
                    : 'bg-brand-bg text-brand-textMuted hover:text-brand-textMain hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All Stories' : cat}
              </button>
            ))}
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {filtered.map((item) => (
              <article
                key={item.slug}
                className="bg-brand-bg rounded-3xl overflow-hidden border border-gray-100 hover:shadow-2xl hover:border-brand-violet/30 transition-all flex flex-col group"
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 bg-brand-violet text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    {item.category}
                  </span>
                </div>

                <div className="p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-xs text-brand-textMuted block mb-2 font-medium">
                      <i className="ph-fill ph-calendar text-brand-violet mr-1"></i> {item.date}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-serif font-bold text-brand-textMain mb-3 leading-snug group-hover:text-brand-violet transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-brand-textMuted leading-relaxed mb-6">
                      {item.snippet}
                    </p>
                  </div>

                  <Link
                    href={`/news/${item.slug}`}
                    className="text-xs font-bold text-brand-violet flex items-center gap-1.5 hover:underline"
                  >
                    Read Full Story <i className="ph-bold ph-arrow-right"></i>
                  </Link>
                </div>
              </article>
            ))}
          </div>

        </div>
      </section>

      <Footer />
    </div>
  );
}
