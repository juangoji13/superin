'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface AdminUser {
  nombre: string;
  rol: string;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // 1. Check demo role first (ONLY in development)
      if (process.env.NODE_ENV === 'development') {
        const demoRole = localStorage.getItem('superin_demo_role');
        const demoUserStr = localStorage.getItem('superin_demo_user');
        
        if (demoRole === 'administradora' && demoUserStr) {
          setUser(JSON.parse(demoUserStr));
          setLoading(false);
          return;
        }
      }

      // 2. Check Supabase Auth
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('usuarios')
        .select('nombre, rol, activo')
        .eq('id', session.user.id)
        .single();

      if (userError || !userData || !userData.activo || userData.rol !== 'administradora') {
        router.push('/login');
        return;
      }

      setUser({
        nombre: userData.nombre,
        rol: userData.rol
      });
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    localStorage.removeItem('superin_demo_role');
    localStorage.removeItem('superin_demo_user');
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  const navItems = [
    { name: 'Pedidos Dashboard', icon: 'dashboard', href: '/admin/pedidos' },
    { name: 'Menú y Stock', icon: 'restaurant_menu', href: '/admin/menu' }
  ];

  return (
    <div className="min-h-screen bg-background text-on-background flex h-screen overflow-hidden font-body-md antialiased">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col py-lg w-[260px] h-screen bg-surface-container border-r border-outline-variant/30 flex-shrink-0 z-10">
        <div className="px-lg pb-lg mb-sm border-b border-outline-variant/30">
          <Link href="/">
            <span className="font-headline-lg text-headline-lg text-primary font-bold tracking-tight">Super IN</span>
          </Link>
        </div>

        {/* User Card */}
        {user && (
          <div className="px-4 py-4 flex items-center gap-3 border-b border-outline-variant/20 mb-sm">
            <div className="w-10 h-10 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold font-headline-lg text-lg">
              {user.nombre[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-label-sm text-sm text-on-surface truncate font-bold">{user.nombre}</p>
              <p className="font-caption text-xs text-on-surface-variant capitalize">{user.rol}</p>
            </div>
          </div>
        )}

        {/* Nav list */}
        <nav className="flex-1 overflow-y-auto space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mx-2 flex items-center gap-3 p-3 rounded-lg transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span className="font-label-sm text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="p-4 mt-auto border-t border-outline-variant/30 flex flex-col gap-sm">
          <button
            onClick={handleLogout}
            className="w-full text-error hover:bg-error-container/10 rounded-lg flex items-center gap-3 p-3 transition-all cursor-pointer font-semibold"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span className="font-label-sm text-sm">Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </div>
    </div>
  );
}
