import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SupabaseProvider } from "@/components/SupabaseProvider";
import { AppHeader } from "@/components/AppHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "co chci jíst 🍽️",
  description: "Swipe meals you'd eat, see what you both want, let fate pick dinner.",
};

export const viewport: Viewport = {
  themeColor: "#da291c",
  width: "device-width",
  initialScale: 1,
};

// Apply the saved theme before paint to avoid a flash. Defaults to McDonald's.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(['light','dark','mcdonalds'].indexOf(t)<0){t='mcdonalds';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <SupabaseProvider>
          <AppHeader />
          <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
            {children}
          </main>
        </SupabaseProvider>
      </body>
    </html>
  );
}
