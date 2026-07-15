'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Order {
  codigo: string;
  cliente: string;
  celular: string;
  direccion: string;
  barrio: string;
  referencia: string;
  franja: string;
  estado: string;
  total: number;
  metodo_pago: string;
  creado_a: string;
}

export default function RepartoPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Authenticate / Role check
  useEffect(() => {
    async function checkRole() {
      const demoRole = localStorage.getItem('superin_demo_role');
      if (demoRole === 'domiciliario' || demoRole === 'administradora') {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('usuarios')
        .select('rol, activo')
        .eq('id', session.user.id)
        .single();

      if (!userData || !userData.activo || (userData.rol !== 'domiciliario' && userData.rol !== 'administradora')) {
        router.push('/login');
        return;
      }
      setLoading(false);
    }
    checkRole();
  }, [router]);

  // Fetch delivery orders
  const fetchDeliveries = async () => {
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .in('estado', ['Confirmado', 'En preparación', 'En camino'])
      .order('creado_a', { ascending: true });

    if (data) {
      setOrders(data as Order[]);
    }
  };

  useEffect(() => {
    fetchDeliveries();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('reparto-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          fetchDeliveries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (code: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: newStatus })
        .eq('codigo', code);

      if (error) throw error;

      // Update local state instantly
      setOrders((prev) =>
        prev
          .map((o) => (o.codigo === code ? { ...o, estado: newStatus } : o))
          .filter((o) => !(o.codigo === code && newStatus === 'Entregado'))
      );
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('superin_demo_role');
    localStorage.removeItem('superin_demo_user');
    supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen w-full flex flex-col font-body-md antialiased pb-12">
      {/* Mobile Navigation Header */}
      <header className="bg-surface sticky top-0 z-40 border-b border-outline-variant/30 px-container-margin h-16 flex items-center justify-between shadow-sm">
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold tracking-tight">Super IN</h1>
        <div className="flex items-center gap-md">
          <button
            onClick={handleLogout}
            className="text-error hover:text-error/80 transition-colors flex items-center gap-xs font-bold text-xs"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Salir
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-container-margin py-lg max-w-md mx-auto w-full space-y-lg">
        {/* Status Header */}
        <div className="flex justify-between items-end mb-sm">
          <div>
            <h2 className="font-title-md text-title-md text-on-background font-bold">Mis Entregas</h2>
            <p className="font-caption text-caption text-on-surface-variant mt-0.5">
              {orders.length} pedidos activos
            </p>
          </div>
          <div className="bg-primary-container text-on-primary-container font-label-sm text-xs px-3 py-1 rounded-full flex items-center gap-xs">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            Activo
          </div>
        </div>

        {/* Deliveries list */}
        {orders.length === 0 ? (
          <div className="text-center py-xl text-on-surface-variant/40 text-xs italic bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant/30">
            No tienes entregas programadas en este momento.
          </div>
        ) : (
          orders.map((o) => {
            const queryAddress = `${o.direccion}, ${o.barrio}, Barranquilla`;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(queryAddress)}`;
            const waUrl = `https://wa.me/${o.celular.replace(/\+/g, '')}?text=${encodeURIComponent(
              `Hola ${o.cliente}, soy el domiciliario de Super IN. Estoy en camino con tu almuerzo.`
            )}`;

            return (
              <article
                key={o.codigo}
                className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-outline-variant/30 flex flex-col gap-md"
              >
                {/* Top Status Bar */}
                <div className="flex justify-between items-center pb-sm border-b border-outline-variant/10">
                  <div>
                    <span className="font-mono font-bold text-primary">{o.codigo}</span>
                    <span className="block text-[10px] text-on-surface-variant mt-0.5">
                      Franja: <strong className="text-on-background">{o.franja}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary text-sm block">
                      ${o.total.toLocaleString('es-CO')}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      {o.metodo_pago}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="space-y-sm text-xs">
                  <div className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm mt-0.5">person</span>
                    <div>
                      <p className="font-semibold text-on-background">{o.cliente}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm mt-0.5">location_on</span>
                    <div>
                      <p className="font-semibold text-on-background">{o.direccion}</p>
                      <p className="text-[11px] text-on-surface-variant">Barrio: {o.barrio}</p>
                      {o.referencia && (
                        <p className="text-[11px] text-error mt-0.5 italic">Ref: {o.referencia}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-on-surface-variant text-sm mt-0.5">phone_iphone</span>
                    <p className="font-semibold text-on-background">{o.celular}</p>
                  </div>
                </div>

                {/* Communication buttons */}
                <div className="grid grid-cols-3 gap-sm pt-sm border-t border-outline-variant/10">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-[11px] font-bold text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">map</span>
                    Ver Mapa
                  </a>
                  <a
                    href={`tel:${o.celular}`}
                    className="flex justify-center items-center gap-1 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-[11px] font-bold text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">call</span>
                    Llamar
                  </a>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 rounded-lg text-[11px] font-bold text-[#1EBE5C] transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">chat</span>
                    WhatsApp
                  </a>
                </div>

                {/* Operational status toggle */}
                <div className="bg-surface-container-low p-1 rounded-xl flex gap-1 mt-sm relative h-11 border border-outline-variant/10">
                  {o.estado !== 'En camino' ? (
                    <button
                      onClick={() => handleUpdateStatus(o.codigo, 'En camino')}
                      className="w-full bg-primary text-on-primary rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:opacity-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">local_shipping</span>
                      Iniciar Reparto (Marcar En Camino)
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateStatus(o.codigo, 'Entregado')}
                      className="w-full bg-secondary text-on-secondary rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:opacity-95 transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Entregado (Finalizar pedido)
                    </button>
                  )}
                </div>
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
