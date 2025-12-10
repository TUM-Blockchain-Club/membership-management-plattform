"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-black/90 backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="w-full px-6 sm:px-12 lg:px-24">
        <nav className="flex items-center justify-between h-16 sm:h-20">
          <Link href="https://www.tum-blockchain.com/" className="flex items-center">
            <Image
              src="/tbc-wordmark.png"
              alt="TUM Blockchain Club"
              width={160}
              height={45}
              className="h-8 sm:h-10 w-auto object-contain brightness-0 invert"
              priority
            />
          </Link>

          <Link
            href="/signin"
            className="group flex items-center gap-2 px-5 py-2 rounded-full border border-white/30 text-white font-medium text-sm transition-all duration-300 hover:bg-white hover:text-black hover:border-white"
          >
            <span>Sign In</span>
            <svg
              className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 4.5l7.5 7.5-7.5 7.5"
              />
            </svg>
          </Link>
        </nav>
      </div>
    </header>
  );
}
