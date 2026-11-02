import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://roselandprep.edu.gh';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/headmaster/', '/teacher/', '/parent/', '/cbt/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
