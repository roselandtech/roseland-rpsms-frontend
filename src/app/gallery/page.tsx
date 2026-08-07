"use client";

import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageHeader from '@/components/layout/PageHeader';

export default function GalleryPage() {
  const [filter, setFilter] = useState('all');

  const photos = [
    { title: "Graduation & Speech Day Ceremony", category: "Speech Day", img: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800" },
    { title: "Science & STEAM Innovation Expo", category: "Academics", img: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800" },
    { title: "Inter-House 100m Sprint Finals", category: "Sports", img: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800" },
    { title: "ICT Lab Keyboarding Session", category: "Campus", img: "https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&q=80&w=800" },
    { title: "Crèche Sensory Play Hour", category: "Early Years", img: "https://images.unsplash.com/photo-1544367567-0f2fcb046ebf?auto=format&fit=crop&q=80&w=800" },
    { title: "Cultural Troupe Drumming Festival", category: "Arts", img: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800" },
    { title: "JHS Debate Championship", category: "Academics", img: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800" },
    { title: "Primary School Library Reading Commons", category: "Campus", img: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=800" },
    { title: "Football Academy Training Match", category: "Sports", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=800" }
  ];

  const filteredPhotos = filter === 'all'
    ? photos
    : photos.filter(p => p.category.toLowerCase() === filter.toLowerCase());

  return (
    <div className="font-sans text-brand-textMain bg-brand-bg min-h-screen flex flex-col">
      <Navbar />

      <PageHeader
        badge="Memories & Celebrations"
        title="Campus Life in Pictures"
        subtitle="A visual showcase of academic milestones, cultural festivals, sports triumphs, and joyful moments at Roseland."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Photo Gallery' }
        ]}
        bgImage="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2000"
      />

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Category Filter */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-14">
            {['all', 'Academics', 'Sports', 'Speech Day', 'Campus', 'Early Years', 'Arts'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
                  filter.toLowerCase() === cat.toLowerCase()
                    ? 'bg-brand-violet text-white shadow-md'
                    : 'bg-brand-bg text-brand-textMuted hover:text-brand-textMain hover:bg-gray-200'
                }`}
              >
                {cat === 'all' ? 'All Moments' : cat}
              </button>
            ))}
          </div>

          {/* Photo Masonry Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPhotos.map((photo, idx) => (
              <div
                key={idx}
                className="group relative rounded-3xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 h-80 border border-gray-100"
              >
                <img
                  src={photo.img}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-6 flex flex-col justify-end">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-yellowLight">
                    {photo.category}
                  </span>
                  <h4 className="text-white font-serif font-bold text-lg leading-tight mt-1">
                    {photo.title}
                  </h4>
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
