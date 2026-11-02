import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://roselandprep.edu.gh';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const routes = [
    { path: '', priority: 1.0, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/about/leadership', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/about/campus', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/about/accreditation', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/academics', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/academics/early-years', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/academics/primary', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/academics/jhs', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/academics/calendar', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/admissions', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/admissions/apply', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/admissions/fees', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/admissions/tour', priority: 0.8, changeFrequency: 'monthly' as const },
    { path: '/admissions/faq', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.9, changeFrequency: 'monthly' as const },
    { path: '/news', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/events', priority: 0.7, changeFrequency: 'weekly' as const },
    { path: '/gallery', priority: 0.7, changeFrequency: 'monthly' as const },
    { path: '/login', priority: 0.6, changeFrequency: 'yearly' as const },
  ];

  return routes.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
