'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

interface OrderDetail {
  id: string;
  pedido_codigo: string;
  nombre: string;
  cantidad: number;
  observaciones: string;
  componentes: any;
}

interface Order {
  codigo: string;
  franja: string;
  estado: string;
  creado_a: string;
  tiempo_estimado?: number;
}

export default function CocinaPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [details, setDetails] = useState<Record<string, OrderDetail[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'confirmados' | 'preparacion'>('confirmados');

  const playChimeSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      // Synthesis of kitchen ding/chime bell
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, ctx.currentTime); // B5 note
      osc.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.1); // Slide up to E6
      
      gainNode.gain.setValueAtTime(0.25, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.0);
    } catch (e) {
      console.warn('Could not play chime', e);
    }
  };

  // Authenticate / Role check
  useEffect(() => {
    async function checkRole() {
      // Demo bypass (ONLY in development)
      if (process.env.NODE_ENV === 'development') {
        const demoRole = localStorage.getItem('superin_demo_role');
        if (demoRole === 'chef' || demoRole === 'administradora') {
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

      if (!userData || !userData.activo || (userData.rol !== 'chef' && userData.rol !== 'administradora')) {
        router.push('/login');
        return;
      }
      setLoading(false);
    }
    checkRole();
  }, [router]);

  // Fetch kitchen orders (Confirmados & En preparación)
  useEffect(() => {
    async function fetchKitchenData() {
      const { data: ordersData } = await supabase
        .from('pedidos')
        .select('codigo, franja, estado, creado_a, tiempo_estimado')
        .in('estado', ['Confirmado', 'En preparación'])
        .order('creado_a', { ascending: true });

      if (ordersData) {
        setOrders(ordersData as Order[]);

        // Fetch details for all these orders
        const codigos = ordersData.map((o) => o.codigo);
        if (codigos.length > 0) {
          const { data: detailsData } = await supabase
            .from('detalles_pedido')
            .select('*')
            .in('pedido_codigo', codigos);

          if (detailsData) {
            const mapped: Record<string, OrderDetail[]> = {};
            detailsData.forEach((d: OrderDetail) => {
              if (!mapped[d.pedido_codigo]) {
                mapped[d.pedido_codigo] = [];
              }
              mapped[d.pedido_codigo].push(d);
            });
            setDetails(mapped);
          }
        }
      }
    }

    fetchKitchenData();

    // Subscribe to realtime changes in pedidos
    const channel = supabase
      .channel('cocina-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          // Play a sound if a new order is 'Confirmado'
          if (payload.eventType === 'INSERT' && payload.new?.estado === 'Confirmado') {
            playChimeSound();
          } else if (payload.eventType === 'UPDATE' && payload.new?.estado === 'Confirmado' && payload.old?.estado !== 'Confirmado') {
            playChimeSound();
          }
          fetchKitchenData();
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
      setOrders(prev => prev.filter(o => !(o.codigo === code && newStatus === 'Listo')));
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
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

  const confirmados = orders.filter((o) => o.estado === 'Confirmado');
  const enPreparacion = orders.filter((o) => o.estado === 'En preparación');

  return (
    <div className="bg-surface text-on-surface h-screen w-screen overflow-hidden flex flex-col antialiased">
      {/* Header */}
      <header className="bg-surface border-b border-outline-variant/70 shadow-sm w-full z-50 flex justify-between items-center px-container-margin h-16 shrink-0">
        <div className="flex items-center gap-md">
          <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-bold tracking-tight">Super IN</span>
          <div className="h-6 w-[1px] bg-outline-variant/70 mx-2"></div>
          <span className="font-title-md text-title-md text-on-surface-variant font-bold">Pantalla de Cocina</span>
        </div>
        <div className="flex items-center gap-lg">
          <div className="flex items-center gap-sm bg-surface-container-high px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
            <span className="font-label-sm text-xs text-on-surface">Live</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-error hover:text-error/80 transition-colors flex items-center gap-xs font-bold text-xs"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Salir
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex bg-surface-container border-b border-outline-variant/70 flex-shrink-0 gap-1 px-md">
        <button
          onClick={() => setActiveTab('confirmados')}
          className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'confirmados' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Nuevos ({confirmados.length})
        </button>
        <button
          onClick={() => setActiveTab('preparacion')}
          className={`flex-1 py-3 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'preparacion' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          En Preparación ({enPreparacion.length})
        </button>
      </div>

      {/* Columns */}
      <main className="flex-1 flex overflow-hidden bg-background">
        {/* Column 1: Confirmados */}
        <section className={`flex-1 flex flex-col border-r border-outline-variant/70 min-w-[300px] overflow-hidden ${activeTab === 'confirmados' ? 'flex' : 'hidden md:flex'}`}>
          <header className="bg-surface-container px-lg py-md flex justify-between items-center border-b border-outline-variant/70 flex-shrink-0">
            <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-sm font-bold">
              Nuevos por Preparar
              <span className="bg-error text-on-error rounded-full px-2 py-0.5 font-caption text-xs font-bold">
                {confirmados.length}
              </span>
            </h2>
            <span className="material-symbols-outlined text-on-surface-variant">receipt_long</span>
          </header>
          <div className="flex-1 overflow-y-auto p-lg space-y-md">
            {confirmados.length === 0 ? (
              <div className="text-center py-xl text-on-surface-variant/40 text-xs italic">
                No hay pedidos en cola.
              </div>
            ) : (
              confirmados.map((o) => (
                <article
                  key={o.codigo}
                  className="bg-surface-container-lowest rounded-2xl p-md border border-outline-variant/70 shadow-sm"
                >
                  <div className="flex justify-between items-start mb-sm">
                    <div>
                      <span className="font-headline-lg-mobile text-primary font-bold block leading-none font-mono">
                        {o.codigo}
                      </span>
                      <span className="font-caption text-xs text-error font-bold mt-1.5 block">
                        Llegada: {o.franja}
                      </span>
                    </div>
                    {o.tiempo_estimado && (
                      <span className="bg-surface-container px-2.5 py-0.5 rounded font-mono text-[10px] text-on-surface-variant font-bold border border-outline-variant/45">
                        {o.tiempo_estimado} min
                      </span>
                    )}
                  </div>
                  
                  {/* Items */}
                  <div className="bg-surface-container-low rounded-xl p-sm mb-md space-y-2 border border-outline-variant/45">
                    {details[o.codigo]?.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 border-b border-outline-variant/40 last:border-0 pb-2 last:pb-0">
                        <span className="font-title-md text-primary font-bold text-sm">
                          {item.cantidad}x
                        </span>
                        <div className="flex-grow">
                          <span className="font-body-md text-on-surface block font-bold leading-tight">
                            {item.nombre}
                          </span>
                          {item.componentes && (
                            <span className="font-body-md text-secondary text-xs block mt-0.5 font-medium">
                              {Object.entries(item.componentes)
                                .map(([_, comp]: any) => comp?.nombre)
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          )}
                          {item.observaciones && (
                            <span className="font-body-md text-error text-xs block mt-0.5 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              {item.observaciones}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(o.codigo, 'En preparación')}
                    className="w-full bg-primary text-on-primary font-label-sm py-3 rounded-full hover:bg-primary-container transition-colors flex justify-center items-center gap-2 active:scale-95 text-xs font-bold cursor-pointer shadow-sm"
                  >
                    Iniciar preparación
                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Column 2: En preparación */}
        <section className={`flex-1 flex flex-col bg-surface-container-low/20 min-w-[300px] overflow-hidden ${activeTab === 'preparacion' ? 'flex' : 'hidden md:flex'}`}>
          <header className="bg-surface-container-highest px-lg py-md flex justify-between items-center border-b border-outline-variant/70 flex-shrink-0">
            <h2 className="font-title-md text-title-md text-on-surface flex items-center gap-sm font-bold">
              En Preparación
              <span className="bg-secondary-container text-on-secondary-container rounded-full px-2 py-0.5 font-caption text-xs font-bold">
                {enPreparacion.length}
              </span>
            </h2>
            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
              skillet
            </span>
          </header>
          <div className="flex-1 overflow-y-auto p-lg space-y-md">
            {enPreparacion.length === 0 ? (
              <div className="text-center py-xl text-on-surface-variant/40 text-xs italic">
                Ningún pedido se está preparando en este momento.
              </div>
            ) : (
              enPreparacion.map((o) => (
                <article
                  key={o.codigo}
                  className="bg-surface-container-lowest rounded-2xl p-md border-2 border-secondary shadow-sm"
                >
                  <div className="flex justify-between items-start mb-sm">
                    <div>
                      <span className="font-headline-lg-mobile text-primary font-bold block leading-none font-mono">
                        {o.codigo}
                      </span>
                      <span className="font-caption text-xs text-error font-bold mt-1.5 block">
                        Llegada: {o.franja}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="bg-surface-container-low rounded-xl p-sm mb-md space-y-2 border border-outline-variant/45">
                    {details[o.codigo]?.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 border-b border-outline-variant/40 last:border-0 pb-2 last:pb-0">
                        <span className="font-title-md text-primary font-bold text-sm">
                          {item.cantidad}x
                        </span>
                        <div className="flex-grow">
                          <span className="font-body-md text-on-surface block font-bold leading-tight">
                            {item.nombre}
                          </span>
                          {item.componentes && (
                            <span className="font-body-md text-secondary text-xs block mt-0.5 font-medium">
                              {Object.entries(item.componentes)
                                .map(([_, comp]: any) => comp?.nombre)
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          )}
                          {item.observaciones && (
                            <span className="font-body-md text-error text-xs block mt-0.5 font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">warning</span>
                              {item.observaciones}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(o.codigo, 'Listo')}
                    className="w-full bg-surface-container border border-primary text-primary font-label-sm py-3 rounded-full hover:bg-primary-container/10 transition-colors flex justify-center items-center gap-2 active:scale-95 text-xs font-bold cursor-pointer shadow-xs"
                  >
                    Marcar como listo
                    <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                  </button>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
