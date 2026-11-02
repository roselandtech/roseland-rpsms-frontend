import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Roseland Preparatory School | Kotoku, Accra",
  description: "Knowledge & Humility. GES-accredited basic education from Crèche to JHS.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" }
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png"
  }
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
      </head>
      <body suppressHydrationWarning className="min-h-full font-sans text-brand-textMain bg-brand-bg">
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
