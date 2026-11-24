import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bluetech — WebGIS Kawasan Pantai Losari",
  description:
    "WebGIS Perencanaan Ruang Laut dan Mitigasi Bencana Kawasan Pantai Losari, Kota Makassar. Peta raster bahaya, zona potensial wisata, mitigasi bencana, dan edukasi pesisir.",
  keywords: [
    "Bluetech",
    "WebGIS",
    "Kawasan Pantai Losari",
    "Makassar",
    "Perencanaan Ruang Laut",
    "Mitigasi Bencana Pesisir",
    "Zona Potensial Wisata",
  ],
  authors: [{ name: "Bluetech" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Bluetech — WebGIS Kawasan Pantai Losari",
    description:
      "WebGIS Perencanaan Ruang Laut dan Mitigasi Bencana Kawasan Pantai Losari, Kota Makassar.",
    siteName: "Bluetech",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {/* Terapkan tema tersimpan sebelum paint agar tidak berkedip */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bluetech-theme');if(t==='gelap'||(t==='sistem'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
