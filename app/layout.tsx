import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WebVitalsReporter } from "@/app/components/WebVitalsReporter";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TBC Member Portal",
  description: "Membership management platform for TUM Blockchain Club",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <TooltipProvider>
          <WebVitalsReporter />
          {children}
          <Toaster theme="dark" />
        </TooltipProvider>
        <Script
          defer
          data-domain="plattform.tum-blockchain.com"
          src="https://plausible.rbg.tum-blockchain.com/js/script.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
