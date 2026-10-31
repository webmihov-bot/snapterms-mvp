import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { isSignedIn, visitorCountry } from "@/lib/auth/signedIn";
import { COPY } from "@/lib/copy";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "600"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: COPY.meta.title, template: "%s · SnapTerms" },
  description: COPY.meta.description,
  openGraph: { title: COPY.meta.title, description: COPY.meta.description, type: "website" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffffff" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [signedIn, country] = await Promise.all([isSignedIn(), visitorCountry()]);
  return (
    <html lang="en" className={inter.variable}>
      <body className="flex min-h-dvh flex-col">
        <Header signedIn={signedIn} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer country={country} supportEmail={process.env.SUPPORT_EMAIL ?? ""} />
      </body>
    </html>
  );
}
