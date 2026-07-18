'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const DeliveryMap = dynamic(() => import('@/components/DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[300px] md:h-[400px] bg-surface-container-high rounded-2xl skeleton flex items-center justify-center border border-outline-variant/40">
      <span className="material-symbols-outlined text-4xl text-outline">map</span>
    </div>
  )
});

interface OrderDetail {
  id: string;
  nombre: string;
  cantidad: number;
  precio: number;
  observaciones: string;
  componentes: any;
}

interface Order {
  codigo: string;
  cliente: string;
  celular: string;
  direccion: string;
  barrio: string;
  referencia: string;
  fecha: string;
  franja: string;
  estado: string;
  subtotal: number;
  domicilio: number;
  total: number;
  metodo_pago: string;
  creado_a: string;
  tiempo_estimado?: number;
}

const STEPS = [
  { name: 'Pedido Recibido', icon: 'receipt', description: 'Super IN ha recibido tu orden y está en cola.' },
  { name: 'Confirmado', icon: 'thumb_up', description: 'La administradora ha confirmado y validado el stock.' },
  { name: 'En Preparación', icon: 'skillet', description: 'Los chefs están preparando tu almuerzo.' },
  { name: 'En Camino', icon: 'two_wheeler', description: 'El repartidor va hacia tu ubicación.' },
  { name: 'Entregado', icon: 'sports_motorsports', description: '¡Buen provecho!' }
];

export default function PedidoEstadoPage() {
  const { id } = useParams();
  const router = useRouter();
  const orderCode = id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Timer countdown
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [whatsappContact, setWhatsappContact] = useState('573001234567');
  const [progress, setProgress] = useState<number>(0);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);

  const playStatusUpdateEffects = (newStatus: string) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const playToneNode = (freq: number, startTime: number, duration: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        };
        playToneNode(523.25, ctx.currentTime, 0.4); // C5
        playToneNode(659.25, ctx.currentTime + 0.15, 0.5); // E5
      }
    } catch (e) {
      console.warn('Audio play blocked or failed', e);
    }

    let originalTitle = document.title;
    let isFlashed = false;
    const interval = setInterval(() => {
      if (document.hidden) {
        document.title = isFlashed ? `🛵 ¡Pedido ${newStatus}!` : originalTitle;
        isFlashed = !isFlashed;
      } else {
        document.title = `Pedido ${newStatus} - Super IN`;
        clearInterval(interval);
      }
    }, 1000);

    setTimeout(() => {
      clearInterval(interval);
      document.title = `Pedido ${newStatus} - Super IN`;
    }, 20000);
  };

  // Fetch configs
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
  
  // Fetch order data
  useEffect(() => {
    if (!orderCode) return;

    async function fetchOrder() {
      try {
        const { data: orderData, error: orderErr } = await supabase
          .from('pedidos')
          .select('*')
          .eq('codigo', orderCode)
          .single();

        if (orderErr || !orderData) {
          console.error('Order not found', orderErr);
          setLoading(false);
          return;
        }

        setOrder(orderData);

        const { data: detailsData, error: detailsErr } = await supabase
          .from('detalles_pedido')
          .select('*')
          .eq('pedido_codigo', orderCode);

        if (detailsData) {
          setDetails(detailsData as OrderDetail[]);
        }
      } catch (err) {
        console.error('Error fetching order', err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();

    // Subscribe to updates
    const channel = supabase
      .channel(`order-updates-${orderCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `codigo=eq.${orderCode}`
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrder((prev) => {
            if (prev && prev.estado !== newOrder.estado) {
              playStatusUpdateEffects(newOrder.estado);
            }
            return newOrder;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderCode]);

  // Countdown logic for 'Pendiente de confirmación'
  useEffect(() => {
    if (!order || order.estado !== 'Pendiente de confirmación') {
      setTimeLeft('');
      return;
    }

    const interval = setInterval(() => {
      const createdTime = new Date(order.creado_a).getTime();
      const limitTime = createdTime + 15 * 60 * 1000; // +15 mins
      const now = new Date().getTime();
      const diff = limitTime - now;

      if (diff <= 0) {
        clearInterval(interval);
        // Mark order as expired or redirect
        router.push(`/pedido/${orderCode}/expirado`);
      } else {
        const minutes = Math.floor(diff / (60 * 1000));
        const seconds = Math.floor((diff % (60 * 1000)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [order, orderCode, router]);

  // Progress bar & time remaining logic based on tiempo_estimado
  useEffect(() => {
    if (!order || !order.tiempo_estimado || order.estado === 'Cancelado' || order.estado === 'Expirado') {
      return;
    }

    if (order.estado === 'Entregado') {
      setProgress(100);
      setRemainingMinutes(0);
      return;
    }

    if (order.estado === 'Pendiente de confirmación') {
      setProgress(5);
      setRemainingMinutes(order.tiempo_estimado);
      return;
    }

    const updateProgress = () => {
      const createdTime = new Date(order.creado_a).getTime();
      const durationMs = order.tiempo_estimado! * 60 * 1000;
      const now = new Date().getTime();
      const elapsedMs = now - createdTime;

      const pct = Math.min(95, Math.max(10, (elapsedMs / durationMs) * 100));
      setProgress(pct);

      const leftMs = Math.max(0, durationMs - elapsedMs);
      setRemainingMinutes(Math.ceil(leftMs / (60 * 1000)));
    };

    updateProgress();
    const interval = setInterval(updateProgress, 15000);
    return () => clearInterval(interval);
  }, [order]);

  // Map state string to timeline step index
  const getActiveStepIndex = (estado: string) => {
    switch (estado) {
      case 'Pendiente de confirmación':
        return 0;
      case 'Confirmado':
        return 1;
      case 'En preparación':
      case 'Listo':
        return 2;
      case 'En camino':
        return 3;
      case 'Entregado':
        return 4;
      default:
        return -1; // e.g. Cancelled or Expired
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    if (order.estado !== 'Pendiente de confirmación') {
      alert('Solo se pueden cancelar pedidos pendientes de confirmación.');
      return;
    }

    const confirmCancel = confirm('¿Estás seguro de que deseas cancelar este pedido?');
    if (!confirmCancel) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'Cancelado' })
        .eq('codigo', orderCode);

      if (error) throw error;
      setOrder(prev => prev ? { ...prev, estado: 'Cancelado' } : null);
      alert('Pedido cancelado correctamente.');
    } catch (err) {
      console.error(err);
      alert('No se pudo cancelar el pedido. Por favor contáctanos por WhatsApp.');
    }
  };

  if (loading) {
    return (
      <div className="pt-4 pb-24 px-container-margin md:px-xl max-w-4xl mx-auto w-full flex flex-col gap-lg">
        <div className="h-40 w-full skeleton rounded-2xl mb-lg border border-outline-variant/30"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
          <div className="flex flex-col gap-lg">
            <div className="h-64 w-full skeleton rounded-2xl border border-outline-variant/30"></div>
            <div className="h-48 w-full skeleton rounded-2xl border border-outline-variant/30"></div>
          </div>
          <div className="h-[400px] w-full skeleton rounded-2xl border border-outline-variant/30"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center text-center px-container-margin py-xl max-w-md mx-auto w-full">
        <span className="material-symbols-outlined text-[64px] text-error mb-md">
          warning
        </span>
        <h2 className="font-title-md text-primary mb-xs">Pedido no encontrado</h2>
        <p className="font-body-md text-on-surface-variant mb-lg">
          No pudimos encontrar ningún pedido con el código <strong>{orderCode}</strong>.
        </p>
        <Link
          href="/"
          className="bg-primary text-on-primary font-label-sm px-lg py-md rounded-full hover:bg-primary-container"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  const activeIndex = getActiveStepIndex(order.estado);

  return (
    <div className="pt-4 pb-24 px-container-margin md:px-xl max-w-4xl mx-auto w-full flex flex-col gap-lg animate-fade-in relative">
      
      {/* Confetti Animation for Delivered Status */}
      {activeIndex === 4 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={`confetti-${i}`}
              className="confetti-piece absolute"
              style={{
                left: `${Math.random() * 100}vw`,
                animationDelay: `${Math.random() * 3}s`,
                backgroundColor: ['#b60065', '#e3037f', '#ffd9e3', '#466557'][Math.floor(Math.random() * 4)]
              }}
            />
          ))}
        </div>
      )}
      <div className="flex items-center gap-sm md:hidden">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
        <h1 className="font-title-md text-title-md text-on-surface">Estado del Pedido</h1>
      </div>

      {/* Status Hero */}
      <section className="flex flex-col items-center justify-center text-center py-lg bg-surface-container-lowest rounded-2xl shadow-[0_4px_12px_rgba(27,67,50,0.08)] border border-outline-variant/70 p-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary-container rounded-full opacity-10 blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-secondary-container rounded-full opacity-10 blur-2xl"></div>
        
        {order.estado === 'Cancelado' ? (
          <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-md z-10">
            <span className="material-symbols-outlined text-3xl">cancel</span>
          </div>
        ) : order.estado === 'Expirado' ? (
          <div className="w-16 h-16 bg-outline-variant/30 text-on-surface-variant rounded-full flex items-center justify-center mb-md z-10">
            <span className="material-symbols-outlined text-3xl">timer_off</span>
          </div>
        ) : (
          <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mb-md z-10">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {activeIndex === 4 ? 'check_circle' : 'restaurant'}
            </span>
          </div>
        )}
        
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-xs z-10">
          {order.estado === 'Cancelado'
            ? 'Pedido Cancelado'
            : order.estado === 'Expirado'
            ? 'Pedido Expirado'
            : `Pedido ${order.estado}`}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant z-10">
          Código: <span className="font-bold text-primary">{order.codigo}</span>
        </p>
      </section>

      {/* Alert Banner / Countdown Timer */}
      {order.estado === 'Pendiente de confirmación' && timeLeft && (
        <div className="bg-secondary-container/20 border-l-4 border-secondary-container p-md rounded-r-lg flex items-start gap-md border border-y-outline-variant/70 border-r-outline-variant/70">
          <span className="material-symbols-outlined text-secondary mt-1">info</span>
          <div>
            <p className="font-label-sm text-label-sm text-on-secondary-container font-semibold">
              Esperando confirmación del restaurante.
            </p>
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              Tu pedido expirará en <strong className="text-primary font-mono text-body-md">{timeLeft}</strong> si no es confirmado.
            </p>
          </div>
        </div>
      )}

      {order.estado === 'Cancelado' && (
        <div className="bg-error-container/20 border-l-4 border-error p-md rounded-r-lg flex items-start gap-md border border-y-outline-variant/70 border-r-outline-variant/70">
          <span className="material-symbols-outlined text-error mt-1">cancel</span>
          <div>
            <p className="font-label-sm text-label-sm text-on-error-container font-semibold">
              Este pedido ha sido cancelado.
            </p>
            <p className="font-caption text-caption text-on-surface-variant mt-1">
              Si crees que es un error, por favor contáctanos por WhatsApp.
            </p>
          </div>
        </div>
      )}

      {/* Estimated Time Progress Bar */}
      {order.tiempo_estimado && order.estado !== 'Cancelado' && order.estado !== 'Expirado' && (
        <article className="bg-surface-container-lowest rounded-2xl p-md shadow-sm border border-outline-variant/70 flex flex-col gap-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-label-sm text-xs text-on-background font-bold">Tiempo Estimado de Entrega</h3>
              <p className="font-caption text-[11px] text-on-surface-variant mt-0.5">
                {order.estado === 'Entregado' 
                  ? '¡Tu pedido ha sido entregado!' 
                  : `Restan aproximadamente ${remainingMinutes} minutos`}
              </p>
            </div>
            <span className="material-symbols-outlined text-primary text-sm">schedule</span>
          </div>

          <div className="w-full bg-surface-container-high rounded-full h-2.5 p-[1px] border border-outline-variant/40 overflow-hidden mt-1">
            <div
              className="bg-primary h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between text-[9px] font-extrabold text-on-surface-variant/80 px-1 mt-0.5">
            <span>Pedido Recibido</span>
            <span>En Preparación</span>
            <span>Entregado</span>
          </div>
        </article>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        {/* Left Column: Details & Items */}
        <div className="flex flex-col gap-lg">
          {/* Summary */}
          <article className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/70 flex flex-col gap-md">
            <h2 className="font-title-md text-title-md text-on-background border-b border-outline-variant/70 pb-sm font-bold">
              Detalles de Entrega
            </h2>
            <div className="flex flex-col gap-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-on-surface-variant font-medium text-xs">Cliente</span>
                <span className="font-semibold text-on-background text-xs">{order.cliente}</span>
              </div>
              <div className="flex justify-between items-start py-1">
                <span className="text-on-surface-variant font-medium text-xs">Dirección</span>
                <span className="font-semibold text-on-background text-right text-xs">
                  {order.direccion}<br />Barrio {order.barrio}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-on-surface-variant font-medium text-xs">Franja Horaria</span>
                <span className="font-semibold text-on-background bg-surface-variant px-3 py-0.5 rounded-full text-xs">
                  {order.franja}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-on-surface-variant font-medium text-xs">Método de Pago</span>
                <span className="font-semibold text-on-background text-xs">{order.metodo_pago}</span>
              </div>
              {order.tiempo_estimado && (
                <div className="flex justify-between items-center py-1 bg-primary-container/10 p-sm rounded-lg border border-outline-variant/40">
                  <span className="text-primary font-bold text-xs">Tiempo estimado</span>
                  <span className="font-bold text-primary text-xs">{order.tiempo_estimado} minutos</span>
                </div>
              )}
            </div>
          </article>

          {/* Items List */}
          <article className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/70 flex flex-col gap-md">
            <h2 className="font-title-md text-title-md text-on-background border-b border-outline-variant/70 pb-sm font-bold">
              Productos Solicitados
            </h2>
            <div className="flex flex-col gap-md">
              {details.map((item) => (
                <div key={item.id} className="flex justify-between items-start pb-sm border-b border-outline-variant/40 last:border-0 last:pb-0">
                  <div>
                    <h4 className="font-label-sm text-on-background font-bold">
                      {item.nombre} <span className="text-primary font-normal">x{item.cantidad}</span>
                    </h4>
                    {item.componentes ? (
                      <p className="font-caption text-on-surface-variant mt-1 text-[11px]">
                        {Object.entries(item.componentes)
                          .map(([_, comp]: any) => comp?.nombre)
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    ) : (
                      item.observaciones && (
                        <p className="font-caption text-on-surface-variant mt-1 text-[11px]">
                          Obs: {item.observaciones}
                        </p>
                      )
                    )}
                  </div>
                  <span className="font-label-sm text-primary font-semibold">
                    ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-outline-variant/40 pt-md flex justify-between items-center mt-sm">
              <span className="font-title-md text-on-background font-bold">Total</span>
              <span className="font-title-md text-primary font-bold">
                ${order.total.toLocaleString('es-CO')} COP
              </span>
            </div>
          </article>

          {/* Actions */}
          <article className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/70 flex flex-col items-center text-center gap-md">
            <p className="font-body-md text-on-surface-variant">
              ¿Quieres realizar un cambio o resolver dudas sobre tu pedido?
            </p>
            <a
              href={`https://wa.me/${whatsappContact}?text=${encodeURIComponent(`Hola, tengo una pregunta sobre mi pedido ${order.codigo}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#25D366] text-white font-label-sm py-3 px-6 rounded-full flex items-center justify-center gap-2 hover:bg-[#1EBE5C] transition-colors shadow-md text-sm font-bold border border-[#25D366]/30"
            >
              <span className="material-symbols-outlined">chat</span>
              Chatear por WhatsApp
            </a>
            {order.estado === 'Pendiente de confirmación' && (
              <button
                onClick={handleCancelOrder}
                className="w-full bg-transparent text-error border border-error hover:bg-error-container/10 font-semibold py-3 px-6 rounded-full flex items-center justify-center gap-sm transition-colors mt-2 text-sm cursor-pointer"
              >
                Cancelar Pedido
              </button>
            )}
          </article>
        </div>

        {/* Right Column: Timeline & Map */}
        <div className="flex flex-col gap-lg">
          <article className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/70 flex flex-col gap-md">
            <h2 className="font-title-md text-title-md text-on-background mb-lg border-b border-outline-variant/70 pb-sm font-bold">
              Seguimiento de Entrega
            </h2>
            {order.estado === 'Cancelado' ? (
              <div className="text-center py-xl text-on-surface-variant flex flex-col items-center">
                <span className="material-symbols-outlined text-[48px] text-error mb-sm">block</span>
                <p className="font-body-md font-semibold">El pedido fue cancelado y no se está procesando.</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row items-start md:items-start w-full relative pt-2">
                {STEPS.map((step, index) => {
                  const isActive = index <= activeIndex;
                  const isCurrent = index === activeIndex;

                  return (
                    <div key={step.name} className="flex-1 flex md:flex-col items-start md:items-center group relative w-full mb-6 md:mb-0">
                      {/* Horizontal Line for Desktop */}
                      {index < STEPS.length - 1 && (
                        <div className={`hidden md:block absolute top-5 left-[50%] w-full h-[2px] z-0 transition-colors duration-500 ${index < activeIndex ? 'bg-primary' : 'bg-outline-variant/40'}`} />
                      )}
                      {/* Vertical Line for Mobile */}
                      {index < STEPS.length - 1 && (
                        <div className={`md:hidden absolute left-[22px] top-10 h-full w-[2px] z-0 transition-colors duration-500 ${index < activeIndex ? 'bg-primary' : 'bg-outline-variant/40'}`} />
                      )}
                      
                      <div className={`relative z-10 w-11 h-11 rounded-full flex items-center justify-center ring-4 ring-surface-container-lowest transition-all duration-300 ${isActive ? 'bg-primary text-on-primary shadow-sm scale-110' : 'bg-surface-container-highest border border-outline-variant text-outline-variant scale-100'}`}>
                        <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>{step.icon}</span>
                      </div>
                      
                      <div className="ml-4 md:ml-0 md:mt-3 md:text-center flex-1 pr-2 md:pr-0">
                        <h3 className={`font-label-sm text-sm transition-colors ${isCurrent ? 'text-primary font-bold' : isActive ? 'text-on-background font-semibold' : 'text-on-surface-variant/60 font-medium'}`}>{step.name}</h3>
                        <p className="hidden md:block font-caption text-xs text-on-surface-variant mt-1.5 px-1 leading-tight max-w-[140px] mx-auto">{step.description}</p>
                        {/* Show description on mobile only if current step */}
                        {isCurrent && (
                          <p className="md:hidden font-caption text-xs text-on-surface-variant mt-1">{step.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>

          {/* Delivery Map */}
          {(activeIndex >= 3 || order.estado === 'Entregado') && order.estado !== 'Cancelado' && order.estado !== 'Expirado' && (
            <article className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/70 flex flex-col gap-md animate-fade-in">
              <h2 className="font-title-md text-title-md text-on-background border-b border-outline-variant/70 pb-sm font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">pin_drop</span>
                Mapa de Seguimiento
              </h2>
              <DeliveryMap status={order.estado} />
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
