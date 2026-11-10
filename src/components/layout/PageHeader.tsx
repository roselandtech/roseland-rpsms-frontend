import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  bgImage?: string;
}

export default function PageHeader({
  badge,
  title,
  subtitle,
  breadcrumbs = [{ label: 'Home', href: '/' }],
  bgImage
}: PageHeaderProps) {
  return (
    <section className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 bg-gray-900 text-white overflow-hidden">
      {/* Background with Dark Overlay Gradient */}
      {bgImage && (
        <div className="absolute inset-0 z-0 opacity-30 mix-blend-overlay">
          <img
            src={bgImage}
            alt={title}
            className="w-full h-full object-cover object-center"
          />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-900/90 to-brand-violetDark/70 z-0"></div>

      {/* Decorative Blur Circles */}
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-violet/20 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-brand-yellow/10 rounded-full blur-3xl pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-xs sm:text-sm text-gray-400 mb-4 font-medium" aria-label="Breadcrumb">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={index} className="flex items-center space-x-2">
                  {index > 0 && <i className="ph ph-caret-right text-xs text-gray-500"></i>}
                  {item.href && !isLast ? (
                    <Link href={item.href} className="hover:text-brand-yellow transition-colors">
                      {item.label}
                    </Link>
                  ) : (
                    <span className="text-brand-yellow font-semibold">{item.label}</span>
                  )}
                </div>
              );
            })}
          </nav>
        )}

        {/* Badge */}
        {badge && (
          <span className="inline-flex items-center py-1 px-3.5 rounded-full bg-brand-yellow/20 border border-brand-yellow/40 text-brand-yellow text-xs font-bold uppercase tracking-widest mb-4">
            {badge}
          </span>
        )}

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-white leading-tight max-w-3xl">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="mt-4 text-base sm:text-lg text-gray-300 max-w-2xl font-light leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
