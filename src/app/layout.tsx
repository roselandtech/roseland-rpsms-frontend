import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Toaster } from 'react-hot-toast';
import DynamicTitleSync from "@/components/layout/DynamicTitleSync";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://roselandprep.edu.gh"),
  title: {
    default: "The Roseland Preparatory School | Adjen Kotoku, Accra",
    template: "%s | Roseland Preparatory School",
  },
  description:
    "The Roseland Preparatory School (PJ9H+FCX, Adjen Kotoku, Ga West, Greater Accra). GES-accredited basic education from Crèche, Nursery, and Primary to Junior High School (JHS). Knowledge & Humility.",
  keywords: [
    "The Roseland Preparatory School",
    "Roseland Preparatory School",
    "Adjen Kotoku school",
    "Ga West school",
    "Accra preparatory school",
    "GES accredited school Ghana",
    "Creche Nursery Primary JHS Adjen Kotoku",
  ],
  openGraph: {
    title: "The Roseland Preparatory School | Adjen Kotoku, Accra",
    description:
      "GES-accredited basic education from Crèche to JHS in PJ9H+FCX, Adjen Kotoku, Greater Accra. Knowledge & Humility.",
    url: "https://roselandprep.edu.gh",
    siteName: "The Roseland Preparatory School",
    locale: "en_GH",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "The Roseland Preparatory School Crest",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "The Roseland Preparatory School | Adjen Kotoku, Accra",
    description:
      "GES-accredited basic education from Crèche to JHS in PJ9H+FCX, Adjen Kotoku, Greater Accra.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png"
  }
};

const schoolJsonLd = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "The Roseland Preparatory School",
  alternateName: "Roseland Preparatory School",
  slogan: "Knowledge & Humility",
  url: "https://roselandprep.edu.gh",
  logo: "https://roselandprep.edu.gh/logo.png",
  telephone: "+233243968988",
  email: "info@roselandprep.edu.gh",
  address: {
    "@type": "PostalAddress",
    streetAddress: "PJ9H+FCX, Adjen Kotoku",
    addressLocality: "Adjen Kotoku, Ga West",
    addressRegion: "Greater Accra",
    addressCountry: "GH",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://unpkg.com" crossOrigin="anonymous" />
        <Script src="https://unpkg.com/@phosphor-icons/web" strategy="afterInteractive" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }}
        />
      </head>
      <body suppressHydrationWarning className="min-h-full font-sans text-brand-textMain bg-brand-bg">
        <DynamicTitleSync />
        <Toaster 
          position="top-center" 
          containerStyle={{ zIndex: 9999999 }}
          toastOptions={{ 
            duration: 3500, 
            style: { 
              borderRadius: '12px', 
              background: '#1e1b4b', 
              color: '#fff', 
              fontSize: '13px', 
              zIndex: 9999999 
            } 
          }} 
        />
        {children}
      </body>
    </html>
  );
}
