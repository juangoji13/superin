'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Order {
  codigo: string;
  cliente: string;
  direccion: string;
  barrio: string;
  franja: string;
  total: number;
}

export default function PedidoExpiradoPage() {
  const { id } = useParams();
  const orderCode = id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    if (!orderCode) return;

    async function fetchAndExpireOrder() {
      try {
        // Set order to Expirado if it was still 'Pendiente de confirmación'
        const { data: currentOrder } = await supabase
          .from('pedidos')
          .select('*')
          .eq('codigo', orderCode)
          .single();

        if (currentOrder) {
          if (currentOrder.estado === 'Pendiente de confirmación') {
            await supabase
              .from('pedidos')
              .update({ estado: 'Expirado' })
              .eq('codigo', orderCode);
            currentOrder.estado = 'Expirado';
          }
          setOrder(currentOrder);
        }
      } catch (err) {
        console.error('Error handling expired order', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAndExpireOrder();
  }, [orderCode]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center py-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-24 px-container-margin md:px-xl max-w-lg mx-auto w-full flex flex-col gap-lg text-center">
      {/* Header Mobile / Navigation placeholder */}
      <div className="flex items-center gap-sm md:hidden text-left">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
        <h1 className="font-title-md text-title-md text-on-surface">Volver al inicio</h1>
      </div>

      {/* Hero card */}
      <section className="flex flex-col items-center justify-center py-xl bg-surface-container-lowest rounded-2xl shadow-[0_4px_12px_rgba(27,67,50,0.08)] border border-outline-variant/30 p-lg relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-error-container rounded-full opacity-15 blur-2xl"></div>
        <div className="w-16 h-16 bg-error-container text-on-error-container rounded-full flex items-center justify-center mb-md z-10">
          <span className="material-symbols-outlined text-3xl font-bold text-error">timer_off</span>
        </div>
        <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-background mb-xs z-10">
          Tiempo Expirado
        </h1>
        <p className="font-body-md text-on-surface-variant z-10 px-md">
          No pudimos confirmar tu pedido <strong>{orderCode}</strong> a tiempo.
        </p>
      </section>

      {/* Warning detail */}
      <div className="bg-error-container/20 border-l-4 border-error p-md rounded-r-lg text-left flex items-start gap-md">
        <span className="material-symbols-outlined text-error mt-1">warning</span>
        <div>
          <p className="font-label-sm text-label-sm text-on-error-container font-semibold">
            El pedido no fue confirmado en 15 minutos.
          </p>
          <p className="font-caption text-caption text-on-surface-variant mt-1">
            Para evitar retrasos y garantizar frescura, los pedidos no confirmados se cancelan automáticamente. Puedes reintentar por WhatsApp.
          </p>
        </div>
      </div>

      {/* Details Card if available */}
      {order && (
        <article className="bg-surface-container-lowest rounded-2xl p-lg shadow-sm border border-outline-variant/30 text-left flex flex-col gap-sm">
          <h2 className="font-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant/20 pb-xs mb-xs font-bold">
            Resumen del pedido expirado
          </h2>
          <div className="flex justify-between text-caption py-1">
            <span className="text-on-surface-variant">Dirección</span>
            <span className="font-semibold text-on-background">{order.direccion}</span>
          </div>
          <div className="flex justify-between text-caption py-1">
            <span className="text-on-surface-variant">Franja de entrega</span>
            <span className="font-semibold text-on-background">{order.franja}</span>
          </div>
          <div className="flex justify-between text-caption py-1">
            <span className="text-on-surface-variant">Total</span>
            <span className="font-semibold text-primary">${order.total.toLocaleString('es-CO')}</span>
          </div>
        </article>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-sm">
        <a
          href={`https://wa.me/${whatsappContact}?text=${encodeURIComponent(`Hola, mi pedido ${orderCode} de la página web expiró. Me gustaría ver si todavía lo pueden preparar.`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] text-white font-label-sm py-4 rounded-full flex items-center justify-center gap-2 hover:bg-[#1EBE5C] transition-colors shadow-md text-sm font-bold active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">chat</span>
          Confirmar por WhatsApp
        </a>

        <Link
          href="/domicilios"
          className="w-full bg-primary text-on-primary font-label-sm py-4 rounded-full hover:bg-primary-container transition-colors shadow-md text-sm font-bold active:scale-[0.98]"
        >
          Volver a Intentar en la Web
        </Link>
      </div>
    </div>
  );
}
