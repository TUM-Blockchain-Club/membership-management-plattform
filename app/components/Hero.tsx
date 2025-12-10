"use client";

import { useEffect, useRef, useState } from "react";

export default function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1;
    }
  }, []);

  return (
    <section className="relative w-full">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className={`absolute w-[140%] max-w-none transition-opacity duration-1000 translate-y-[-10%]`}
            onLoadedData={() => setIsLoaded(true)}
          >
            <source src="/hero.webm" type="video/webm" />
          </video>
        </div>
        
      </div>

      <div className="relative z-10 flex flex-col justify-center min-h-screen px-6 sm:px-12 lg:px-24 pt-20 translate-y-[+2%] translate-x-[+5%]">
        <div className="max-w-2xl">
          <h1
            className={`text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.1] mb-6 transition-all duration-700 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "0.2s" }}
          >
            <span className="block text-white">Membership</span>
            <span className="block text-white">Management</span>
            <span className="block text-gradient bg-clip-text text-transparent">
              Platform
            </span>
          </h1>

          <p
            className={`max-w-xl text-base sm:text-lg text-white/50 mb-10 leading-relaxed transition-all duration-700 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-8"
            }`}
            style={{ transitionDelay: "0.3s" }}
          >
            A platform for managing TBC members. Built by the TUM Blockchain Club.
          </p>
        </div>
        
      </div>
    </section>
  );
}
