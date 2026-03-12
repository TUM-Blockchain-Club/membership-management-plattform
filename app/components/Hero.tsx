"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Hero() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-6 py-20">
      <div className="absolute inset-0 grid-background">
        <div className="absolute inset-0 grid-pattern" />
        <div className="absolute inset-0 grid-glow" />
      </div>

      <div
        className={`relative z-10 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-6 sm:p-10 md:p-12 lg:p-16 max-w-xl w-full text-center transition-all duration-1000 ${
          isLoaded
            ? "opacity-100 translate-y-0 animate-border-draw"
            : "opacity-0 translate-y-8"
        }`}
      >
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-tight mb-3 sm:mb-4 text-white text-balance">
          Membership Managment Plattform
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-white/60 mb-8 sm:mb-10 leading-relaxed">
          Exclusive access for TUM Blockchain Club.
        </p>

        <Link
          href="/signin"
          className="inline-flex items-center justify-center gap-2 sm:gap-3 px-8 sm:px-10 py-3 sm:py-4 rounded-full border border-white/30 text-white font-medium text-sm transition-all duration-300 hover:bg-white hover:text-black hover:border-white"
        >
          <span>Sign In</span>
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 4.5l7.5 7.5-7.5 7.5"
            />
          </svg>
        </Link>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 sm:bottom-8 left-0 right-0 text-center px-4">
        <p className="text-xs sm:text-sm text-white/40">
          Built by TUM Blockchain Club
        </p>
      </div>
    </section>
  );
}
