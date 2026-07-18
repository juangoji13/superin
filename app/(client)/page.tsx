'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const statsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full min-h-[618px] flex items-center justify-center bg-surface-container-low px-container-margin md:px-xl py-xl overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="w-full h-[120%] bg-cover bg-center opacity-40 parallax-bg"
            style={{
              backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDLuXXf0trIIA-AE4svzO90QJaxj39J9ga2yD1wEKgxYM_agO-J-4lQPt4pHBr_iieCZYrDJgdH1Krrwp4duu4LsHqiYYIUD8QyIPBEaH5dYNnB0MZxH97m4KNO_f0eoG9xk9eqk6SbxkKP_zcf7YTpm2t8wQYVY4bo-7nA576JgEs2XToKsg6ZNNImrUi92SmOdaGLMfeEapJV6i0RUAhBH1A1PHP5hSWoY1jt1HxDIVFXqgjpeJqYfQ_JVDiPy9gzzvk9Nl3670k')`,
              transform: `translateY(${scrollY * 0.4}px)`
            }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/80 to-transparent"></div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-lg items-center">
          <div className="flex flex-col gap-md max-w-xl">
            <span className="inline-block px-3 py-1 bg-secondary-container text-on-secondary-container font-label-sm text-label-sm rounded-full w-fit">
              Barranquilla
            </span>
            <h1 className="font-display-lg text-display-lg md:text-[64px] md:leading-[72px] text-on-background font-bold tracking-tight">
              Tu almuerzo favorito, <span className="text-primary">directo a tu puerta</span>
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 mb-4">
              Pide fácil, recibe rápido y disfruta comida casera preparada con los mejores ingredientes locales.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/domicilios"
                className="bg-primary text-on-primary font-label-sm text-label-sm rounded-full px-8 py-4 hover:bg-primary-container btn-haptic transition-all shadow-[0_4px_12px_rgba(27,67,50,0.15)] flex items-center justify-center gap-2 w-fit"
              >
                Ver menú de hoy
                <span className="material-symbols-outlined text-[20px]" data-icon="arrow_forward">
                  arrow_forward
                </span>
              </Link>
            </div>
            
            {/* Quick Stats / Social Proof */}
            <div ref={statsRef} className="flex gap-lg mt-8 pt-6 border-t border-outline-variant/30">
              <div className="flex flex-col">
                <span className={`font-display-lg text-2xl font-bold text-primary ${statsVisible ? 'animate-count-up' : 'opacity-0'}`} style={{animationDelay: '0.2s', animationFillMode: 'both'}}>+15,000</span>
                <span className="font-caption text-xs text-on-surface-variant font-medium">Pedidos entregados</span>
              </div>
              <div className="w-[1px] h-10 bg-outline-variant/30"></div>
              <div className="flex flex-col">
                <span className={`font-display-lg text-2xl font-bold text-primary ${statsVisible ? 'animate-count-up' : 'opacity-0'}`} style={{animationDelay: '0.4s', animationFillMode: 'both'}}>100%</span>
                <span className="font-caption text-xs text-on-surface-variant font-medium">Sabor casero local</span>
              </div>
            </div>
          </div>

          {/* Hero Logo Card (Right Column) */}
          <div className="flex justify-center items-center">
            <div className="relative p-6 bg-white/90 backdrop-blur-md rounded-3xl border border-outline-variant/40 shadow-soft-lift overflow-hidden max-w-sm aspect-square w-full transition-transform duration-500 hover:scale-[1.02] flex justify-center items-center">
              <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-secondary/15 rounded-full blur-2xl"></div>
              <img
                src="/logo.png"
                alt="Super IN Logo"
                className="w-full h-full object-contain relative z-10 drop-shadow-md animate-toast-in"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Services Bento Grid */}
      <section className="max-w-7xl mx-auto px-container-margin md:px-xl py-xl md:py-[80px] w-full">
        <div className="text-center mb-xl">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-background">
            Nuestros Servicios
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Soluciones gastronómicas para cada ocasión
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          {/* Domicilios Card */}
          <Link
            href="/domicilios"
            className="group relative overflow-hidden rounded-xl bg-surface-container shadow-[0_4px_12px_rgba(27,67,50,0.08)] hover:shadow-[0_8px_24px_rgba(27,67,50,0.12)] transition-all duration-300 min-h-[320px] flex flex-col justify-end p-lg cursor-pointer text-left"
          >
            <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-105">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBSValRAfyLenBekAKt0AxD9MBTwbyTa3ldVEk8uN-Xbmtl1qLvWCBRfUWko_aGGd_txgHi8SS4fK9l8AYv5onPZQXJkq_L7YXVtlwjhln-zz4Im4BlkDk1xQ7PWqBdnbToYP71XVF3kkAINS9sVA07mm9_Trp_t2xdnGVB-rZaGQQ9PjH82nLOCkQ800ZiICbL0J31KGF_tgm_OYQeYVkJNSRvWFX0V0iJPAZruk7lG3YpjFm6kCnDWFs416A7lB0bvjJEhbJWtec')`,
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/40 to-transparent"></div>
            </div>
            <div className="relative z-10 text-white">
              <div className="bg-primary/90 p-3 rounded-full inline-flex mb-4 backdrop-blur-sm">
                <span className="material-symbols-outlined text-white" data-icon="two_wheeler">
                  two_wheeler
                </span>
              </div>
              <h3 className="font-title-md text-title-md font-bold mb-2">Domicilios</h3>
              <p className="font-body-md text-body-md text-white/90">
                Tu almuerzo diario entregado con rapidez y frescura en tu hogar u oficina.
              </p>
            </div>
          </Link>

          {/* Salón de eventos Card */}
          <Link
            href="/eventos"
            className="group relative overflow-hidden rounded-xl bg-surface-container shadow-[0_4px_12px_rgba(27,67,50,0.08)] hover:shadow-[0_8px_24px_rgba(27,67,50,0.12)] transition-all duration-300 min-h-[320px] flex flex-col justify-end p-lg cursor-pointer text-left"
          >
            <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-105">
              <div
                className="w-full h-full bg-cover bg-center"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuB3o4B52PF2GyMxdB6y3tVlNqK6LghmNXciSfl8b2TZ0HqQL5KDCpqjQAS7MRWa91VpAj6Mu4mIv2g4vOXSgQET9qM9wDA4YHKzsAQjXAQa28SApnPwJLY8wBGpkeLuf52SAwJTUfTDloXz8b4YbSRJXnVBJBx4IDVLf4-To1B17_TmcPs_V1heZaJXAgod28502ydTN1eTVecTdlS6Cwa-M6bkudWRsbgCRUvjOPbvqZUe4N0-Ewdq8FtAuxsGZatt5iaq2ML5woY')`,
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-on-background/80 via-on-background/40 to-transparent"></div>
            </div>
            <div className="relative z-10 text-white">
              <div className="bg-secondary-container/90 text-on-secondary-container p-3 rounded-full inline-flex mb-4 backdrop-blur-sm">
                <span className="material-symbols-outlined" data-icon="celebration">
                  celebration
                </span>
              </div>
              <h3 className="font-title-md text-title-md font-bold mb-2">Salón de eventos</h3>
              <p className="font-body-md text-body-md text-white/90">
                Espacios elegantes y catering exclusivo para tus celebraciones más importantes.
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
