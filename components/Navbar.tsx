'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

export default function Navbar() {
  const pathname = usePathname();
  const { cartCount } = useCart();
  const [whatsappContact, setWhatsappContact] = useState('573001234567');

  useEffect(() => {
    async function fetchWhatsapp() {
      try {
        const { data } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'whatsapp_contacto')
          .single();
        if (data?.valor && typeof data.valor === 'object' && 'numero' in data.valor) {
          setWhatsappContact((data.valor as any).numero || '573001234567');
        }
      } catch (err) {
        console.error('Failed to load support phone', err);
      }
    }
    fetchWhatsapp();
  }, []);

  const isLinkActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <>
      {/* TopNavBar (Web / Desktop) */}
      <header className="hidden md:flex fixed top-0 left-0 w-full z-50 justify-between items-center px-container-margin h-20 bg-surface/90 backdrop-blur-md shadow-sm border-b border-outline-variant">
        <Link href="/" className="font-headline-lg text-headline-lg text-primary font-bold tracking-tight hover:opacity-90 transition-opacity">
          Super IN
        </Link>
        <nav className="flex gap-[40px]">
          <Link
            href="/domicilios"
            className={`${
              isLinkActive('/domicilios')
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant font-medium hover:text-primary border-b-2 border-transparent'
            } pb-2 px-1 font-title-md text-title-md transition-all duration-200`}
          >
            Menú
          </Link>
          <Link
            href="/eventos"
            className={`${
              isLinkActive('/eventos')
                ? 'text-primary border-b-2 border-primary font-bold'
                : 'text-on-surface-variant font-medium hover:text-primary border-b-2 border-transparent'
            } pb-2 px-1 font-title-md text-title-md transition-all duration-200`}
          >
            Eventos
          </Link>
          <a
            href={`https://wa.me/${whatsappContact}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-on-surface-variant font-medium hover:text-primary border-b-2 border-transparent pb-2 px-1 transition-all duration-200 font-title-md text-title-md"
          >
            Soporte
          </a>
        </nav>
        <div className="flex gap-md items-center text-primary">
          <Link 
            href="/carrito" 
            className="flex items-center gap-2 bg-primary text-on-primary font-label-sm px-4 py-2 rounded-full hover:bg-primary-container transition-all shadow-[0_2px_8px_rgba(1,45,29,0.15)] hover:shadow-[0_4px_12px_rgba(1,45,29,0.2)] scale-95 active:scale-90"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="shopping_cart">
              shopping_cart
            </span>
            <span className="font-bold text-xs">Mi Pedido</span>
            <span className="bg-secondary-container text-on-secondary-container text-xs font-extrabold rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {cartCount}
            </span>
          </Link>
          <Link href="/admin/pedidos" className="p-2 scale-95 active:opacity-80 transition-all hover:bg-surface-container rounded-full text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined" data-icon="account_circle">
              account_circle
            </span>
          </Link>
        </div>
      </header>

      {/* BottomNavBar (Mobile) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden flex justify-around items-center px-4 pb-safe h-16 bg-surface-container-lowest border-t border-outline-variant/30 shadow-[0_-4px_12px_rgba(27,67,50,0.08)] rounded-t-xl">
        <Link
          href="/"
          className={`flex flex-col items-center justify-center p-2 tap-highlight-transparent active:scale-90 transition-transform ${
            isLinkActive('/') && pathname === '/'
              ? 'bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 mt-1 font-bold'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="home">
            home
          </span>
          {pathname !== '/' && <span className="font-caption text-caption mt-1">Inicio</span>}
        </Link>

        <Link
          href="/domicilios"
          className={`flex flex-col items-center justify-center p-2 tap-highlight-transparent active:scale-90 transition-transform ${
            isLinkActive('/domicilios')
              ? 'bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 mt-1 font-bold'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="restaurant">
            restaurant
          </span>
          {!isLinkActive('/domicilios') && <span className="font-caption text-caption mt-1">Menú</span>}
        </Link>

        <Link
          href="/carrito"
          className={`relative flex flex-col items-center justify-center p-2 tap-highlight-transparent active:scale-90 transition-transform ${
            isLinkActive('/carrito')
              ? 'bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 mt-1 font-bold'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="shopping_bag">
            shopping_bag
          </span>
          {cartCount > 0 && !isLinkActive('/carrito') && (
            <span className="absolute top-1 right-2 bg-tertiary text-white text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
          {!isLinkActive('/carrito') && <span className="font-caption text-caption mt-1">Carrito</span>}
        </Link>

        <Link
          href="/admin/pedidos"
          className={`flex flex-col items-center justify-center p-2 tap-highlight-transparent active:scale-90 transition-transform ${
            isLinkActive('/admin')
              ? 'bg-secondary-container text-on-secondary-container rounded-full px-4 py-1 mt-1 font-bold'
              : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined" data-icon="person">
            person
          </span>
          {!isLinkActive('/admin') && <span className="font-caption text-caption mt-1">Perfil</span>}
        </Link>
      </nav>
    </>
  );
}
