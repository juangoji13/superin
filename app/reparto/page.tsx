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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmOrderCode, setConfirmOrderCode] = useState<string | null>(null);

  // Authenticate / Role check
  useEffect(() => {
    async function checkRole() {
      // Demo bypass (ONLY in development)
      if (process.env.NODE_ENV === 'development') {
        const demoRole = localStorage.getItem('superin_demo_role');
        if (demoRole === 'domiciliario' || demoRole === 'administradora') {
          setLoading(false);
          return;
        }
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
      .in('estado', ['Confirmado', 'En preparación', 'Listo', 'En camino'])
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
  
  const executeConfirmDelivery = async () => {
    if (!confirmOrderCode) return;
    await handleUpdateStatus(confirmOrderCode, 'Entregado');
    setShowConfirmModal(false);
    setConfirmOrderCode(null);
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
      <header className="bg-surface sticky top-0 z-40 border-b border-outline-variant/70 px-container-margin h-16 flex items-center justify-between shadow-sm">
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
          <div className="text-center py-xl text-on-surface-variant/40 text-xs italic bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant/70">
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
                className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-outline-variant/70 flex flex-col gap-md"
              >
                {/* Top Status Bar */}
                <div className="flex justify-between items-center pb-sm border-b border-outline-variant/45">
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
                <div className="grid grid-cols-3 gap-sm pt-sm border-t border-outline-variant/40">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-[11px] font-bold text-on-surface border border-outline-variant/40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">map</span>
                    Ver Mapa
                  </a>
                  <a
                    href={`tel:${o.celular}`}
                    className="flex justify-center items-center gap-1 py-2 bg-surface-container hover:bg-surface-container-high rounded-lg text-[11px] font-bold text-on-surface border border-outline-variant/40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">call</span>
                    Llamar
                  </a>
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex justify-center items-center gap-1 py-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 rounded-lg text-[11px] font-bold text-[#1EBE5C] border border-[#25D366]/30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">chat</span>
                    WhatsApp
                  </a>
                </div>

                {/* Operational status toggle */}
                <div className="bg-surface-container-low p-1 rounded-xl flex gap-1 mt-sm relative h-11 border border-outline-variant/40">
                  {o.estado !== 'Listo' && o.estado !== 'En camino' ? (
                    <button
                      disabled
                      className="w-full bg-surface-container-high text-on-surface-variant/60 rounded-lg text-xs font-bold flex justify-center items-center gap-1 opacity-70 cursor-not-allowed border border-outline-variant/40"
                    >
                      <span className="material-symbols-outlined text-sm animate-pulse">skillet</span>
                      En Cocina (Esperando preparación)
                    </button>
                  ) : o.estado === 'Listo' ? (
                    <button
                      onClick={() => handleUpdateStatus(o.codigo, 'En camino')}
                      className="w-full bg-primary text-on-primary rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:opacity-90 transition-all cursor-pointer shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm">local_shipping</span>
                      Iniciar Reparto (Confirmar salida)
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setConfirmOrderCode(o.codigo);
                        setShowConfirmModal(true);
                      }}
                      className="w-full bg-[#2e7d32] text-white rounded-lg text-xs font-bold flex justify-center items-center gap-1 hover:opacity-90 transition-all cursor-pointer shadow-sm"
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full p-lg rounded-2xl border border-outline-variant/70 shadow-2xl flex flex-col gap-md">
            <h3 className="font-title-md text-[#2e7d32] font-bold flex items-center gap-sm">
              <span className="material-symbols-outlined text-[#2e7d32] text-xl">check_circle</span>
              Confirmar Entrega
            </h3>
            <p className="text-xs text-on-surface-variant">
              ¿Estás seguro de que deseas marcar el pedido <strong className="font-mono text-on-surface font-extrabold">{confirmOrderCode}</strong> como entregado? Esto finalizará la orden en el sistema.
            </p>

            <div className="flex gap-sm mt-lg">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmOrderCode(null);
                }}
                className="flex-1 border border-outline text-on-surface text-xs font-bold py-2.5 rounded-full hover:bg-surface-container-high transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirmDelivery}
                className="flex-1 bg-[#2e7d32] text-white text-xs font-bold py-2.5 rounded-full hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
