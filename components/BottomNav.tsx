'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/context/CartContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { cart } = useCart();
  
  // Calculate total items in cart
  const cartItemsCount = cart.reduce((total, item) => total + item.cantidad, 0);

  const navItems = [
    {
      label: 'Inicio',
      icon: 'home',
      href: '/',
      isActive: pathname === '/'
    },
    {
      label: 'Menú',
      icon: 'restaurant_menu',
      href: '/domicilios',
      isActive: pathname === '/domicilios'
    },
    {
      label: 'Carrito',
      icon: 'shopping_cart',
      href: '/carrito',
      isActive: pathname === '/carrito',
      badge: cartItemsCount > 0 ? cartItemsCount : undefined
    },
    {
      label: 'Eventos',
      icon: 'celebration',
      href: '/eventos',
      isActive: pathname === '/eventos'
    }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-lg border-t border-outline-variant/30 z-50 pb-safe">
      <ul className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <li key={item.label} className="w-full">
            <Link 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300 ${
                item.isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <div className="relative">
                <span 
                  className={`material-symbols-outlined text-[24px] transition-transform duration-300 ${
                    item.isActive ? 'scale-110' : 'scale-100'
                  }`}
                  style={{ fontVariationSettings: item.isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-error text-surface text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-sm animate-bounce-short">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide ${item.isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
