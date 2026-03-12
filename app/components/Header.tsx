"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="w-full px-4 sm:px-6 md:px-12 lg:px-24">
        <nav className="flex items-center h-16 sm:h-20">
          <Link href="https://www.tum-blockchain.com/" className="flex items-center">
            <Image
              src="/tbc-wordmark.png"
              alt="TUM Blockchain Club"
              width={140}
              height={40}
              className="h-7 sm:h-9 w-auto object-contain brightness-0 invert opacity-90 hover:opacity-100 transition-opacity duration-300"
              priority
            />
          </Link>
        </nav>
      </div>
    </header>
  );
}
