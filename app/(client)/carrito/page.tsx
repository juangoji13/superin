'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

// Standard fallback time slots
const DEFAULT_TIME_SLOTS = [
  '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45', '13:00', '13:15', '13:30', '13:45', '14:00'
];

export default function CarritoPage() {
  const router = useRouter();
  const { cart, cartTotal, updateQuantity, removeFromCart, clearCart } = useCart();

  // Form states
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [direccion, setDireccion] = useState('');
  const [barrio, setBarrio] = useState('');
  const [referencia, setReferencia] = useState('');
  const [deliveryDate, setDeliveryDate] = useState<'hoy' | 'manana'>('hoy');
  const [deliveryType, setDeliveryType] = useState<'inmediato' | 'programado'>('inmediato');
  const [selectedSlot, setSelectedSlot] = useState('Inmediato');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia'>('Efectivo');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // File upload state
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Configuration from database
  const [deliveryCost, setDeliveryCost] = useState(5000);
  const [timeSlots, setTimeSlots] = useState<string[]>(DEFAULT_TIME_SLOTS);
  const [whatsappContact, setWhatsappContact] = useState('573001234567');
  const [bancos, setBancos] = useState<any[]>([]);
  const [isLocalOpen, setIsLocalOpen] = useState(true);

  // Fetch configs
  useEffect(() => {
    async function fetchConfig() {
      try {
        const { data: openData } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'horarios_servicio')
          .single();
        if (openData?.valor && typeof openData.valor === 'object' && 'abierto' in openData.valor) {
          setIsLocalOpen((openData.valor as any).abierto);
        }

        const { data: costData } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'costo_domicilio')
          .single();
        if (costData?.valor && typeof costData.valor === 'object' && 'valor' in costData.valor) {
          setDeliveryCost((costData.valor as any).valor || 5000);
        }

        const { data: slotsData } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'franjas_entrega')
          .single();
        if (slotsData?.valor && Array.isArray(slotsData.valor)) {
          setTimeSlots(slotsData.valor as string[]);
        }

        const { data: waData } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'whatsapp_contacto')
          .single();
        if (waData?.valor && typeof waData.valor === 'object' && 'numero' in waData.valor) {
          setWhatsappContact((waData.valor as any).numero || '573001234567');
        }

        const { data: bData } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'datos_transferencia')
          .single();
        if (bData?.valor && typeof bData.valor === 'object' && 'bancos' in bData.valor) {
          setBancos((bData.valor as any).bancos || []);
        } else {
          // Default fallback
          setBancos([
            { banco: 'Nequi', numero: '3001234567', titular: 'Super IN' },
            { banco: 'Bancolombia', numero: 'Ahorros 123-456789-01', titular: 'Super IN SAS' }
          ]);
        }
      } catch (err) {
        console.error('Failed to load configs from Supabase. Using defaults.', err);
      }
    }
    fetchConfig();
  }, []);

  // Format date helper
  const getFormattedDeliveryDate = () => {
    const d = new Date();
    if (deliveryDate === 'manana') {
      d.setDate(d.getDate() + 1);
    }
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    return `${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    
    // Name validation: min 3 chars, letters and spaces only
    if (!nombre.trim()) {
      tempErrors.nombre = 'El nombre completo es obligatorio.';
    } else if (nombre.trim().length < 3) {
      tempErrors.nombre = 'El nombre debe tener al menos 3 caracteres.';
    } else if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre.trim())) {
      tempErrors.nombre = 'El nombre solo debe contener letras.';
    }

    // Celular validation (clean it first)
    const cleanedCel = celular.replace(/\D/g, '');
    if (!celular.trim()) {
      tempErrors.celular = 'El celular es obligatorio.';
    } else if (cleanedCel.length !== 10 && cleanedCel.length !== 12) {
      tempErrors.celular = 'El celular debe tener 10 dígitos (ej. 3001234567).';
    } else if (cleanedCel.length === 10 && !cleanedCel.startsWith('3')) {
      tempErrors.celular = 'El celular debe empezar por 3.';
    } else if (cleanedCel.length === 12 && !cleanedCel.startsWith('573')) {
      tempErrors.celular = 'El celular con indicativo de Colombia debe iniciar con 573.';
    }

    // Dirección validation: min 5 chars
    if (!direccion.trim()) {
      tempErrors.direccion = 'La dirección es obligatoria.';
    } else if (direccion.trim().length < 5) {
      tempErrors.direccion = 'La dirección debe tener al menos 5 caracteres.';
    }

    // Barrio validation: min 3 chars
    if (!barrio.trim()) {
      tempErrors.barrio = 'El barrio es obligatorio.';
    } else if (barrio.trim().length < 3) {
      tempErrors.barrio = 'El barrio debe tener al menos 3 caracteres.';
    }

    // Slots validation if programado
    if (deliveryType === 'programado' && !selectedSlot) {
      tempErrors.selectedSlot = 'Por favor selecciona una franja horaria de entrega.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!validateForm()) {
      return;
    }

    if (paymentMethod === 'Transferencia' && !receiptFile) {
      alert('Por favor adjunta el comprobante de transferencia.');
      return;
    }

    setSubmitting(true);

    try {
      // Sanitize inputs to prevent basic XSS / code injection
      const cleanNombre = nombre.trim().replace(/<[^>]*>/g, '');
      const cleanDireccion = direccion.trim().replace(/<[^>]*>/g, '');
      const cleanBarrio = barrio.trim().replace(/<[^>]*>/g, '');
      const cleanReferencia = referencia.trim().replace(/<[^>]*>/g, '');

      // Clean phone number and auto-prepend 57 if 10 digits
      let cleanCelular = celular.replace(/\D/g, '');
      if (cleanCelular.length === 10) {
        cleanCelular = '57' + cleanCelular;
      }

      // 1. Generate unique order code (e.g. SUP-XXXX)
      const orderCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate totals
      const total = cartTotal + deliveryCost;

      // Calculate YYYY-MM-DD delivery date
      const deliveryDateObj = new Date();
      if (deliveryDate === 'manana') {
        deliveryDateObj.setDate(deliveryDateObj.getDate() + 1);
      }
      const formattedDateString = deliveryDateObj.toISOString().split('T')[0];

      // Determine final slot value
      const finalSlot = deliveryType === 'inmediato' ? 'Inmediato' : selectedSlot;

      // 2. Upload file to Supabase Storage if applicable
      let receiptUrl = '';
      if (paymentMethod === 'Transferencia' && receiptFile) {
        setUploading(true);
        const fileExt = receiptFile.name.split('.').pop();
        const fileName = `${orderCode}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('comprobantes')
          .upload(filePath, receiptFile);

        if (uploadError) {
          throw new Error(`Error subiendo el comprobante: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(filePath);

        receiptUrl = publicUrl;
        setUploading(false);
      }

      // 3. Insert into public.pedidos
      const { error: orderError } = await supabase
        .from('pedidos')
        .insert({
          codigo: orderCode,
          cliente: cleanNombre,
          celular: cleanCelular,
          direccion: cleanDireccion,
          barrio: cleanBarrio,
          referencia: cleanReferencia,
          fecha: formattedDateString,
          franja: finalSlot,
          estado: 'Pendiente de confirmación',
          subtotal: cartTotal,
          domicilio: deliveryCost,
          total: total,
          metodo_pago: paymentMethod
        });

      if (orderError) {
        throw new Error(`Error creando el pedido: ${orderError.message}`);
      }

      // 4. Insert into public.detalles_pedido
      const detailsInserts = cart.map(item => ({
        pedido_codigo: orderCode,
        nombre: item.nombre,
        componentes: item.componentes || null,
        cantidad: item.cantidad,
        precio: item.precio,
        observaciones: item.observaciones
      }));

      const { error: detailsError } = await supabase
        .from('detalles_pedido')
        .insert(detailsInserts);

      if (detailsError) {
        throw new Error(`Error guardando detalles: ${detailsError.message}`);
      }

      // 5. Insert public.comprobantes if URL exists
      if (receiptUrl) {
        const { error: receiptError } = await supabase
          .from('comprobantes')
          .insert({
            pedido_codigo: orderCode,
            url_archivo: receiptUrl
          });

        if (receiptError) {
          console.error('Error recording receipt record but order was placed:', receiptError);
        }
      }

      // 6. Construct WhatsApp message
      let orderItemsText = '';
      cart.forEach(item => {
        if (item.type === 'custom' && item.componentes) {
          const comps = item.componentes;
          const extras = [
            comps.arroz.nombre,
            comps.proteina.nombre,
            comps.acompanamiento.nombre,
            comps.bebida.nombre,
            comps.ensalada?.nombre,
            comps.sopa?.nombre,
            comps.postre?.nombre
          ].filter(Boolean).join(', ');
          orderItemsText += `- ${item.cantidad} x ${item.nombre} armado (${extras})\n`;
        } else {
          orderItemsText += `- ${item.cantidad} x ${item.nombre}${item.observaciones ? ` (Obs: ${item.observaciones})` : ''}\n`;
        }
      });

      const messageText = `Hola, hice el pedido ${orderCode} desde la página.

Cliente: ${nombre}
Entrega: ${getFormattedDeliveryDate()}, ${selectedSlot}
Dirección: ${direccion}, Barrio ${barrio}${referencia ? ` (Ref: ${referencia})` : ''}
Pedido:
${orderItemsText}
Total: $${total.toLocaleString('es-CO')}
Pago: ${paymentMethod}`;

      const whatsappUrl = `https://wa.me/${whatsappContact}?text=${encodeURIComponent(messageText)}`;

      // 7. Clear cart & Redirect
      clearCart();
      router.push(`/pedido/${orderCode}`);

      // Open WhatsApp in a new tab
      window.open(whatsappUrl, '_blank');

    } catch (err: any) {
      alert(`Ocurrió un error al registrar el pedido: ${err.message || err}`);
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center px-container-margin py-xl max-w-md mx-auto w-full">
        <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30 mb-md">
          shopping_basket
        </span>
        <h2 className="font-title-md text-primary mb-xs">Tu carrito está vacío</h2>
        <p className="font-body-md text-on-surface-variant mb-lg">
          Parece que aún no has agregado ningún plato a tu pedido.
        </p>
        <Link
          href="/domicilios"
          className="bg-primary text-on-primary font-label-sm px-lg py-md rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-md"
        >
          Explorar menú de hoy
        </Link>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-32 px-container-margin max-w-lg mx-auto w-full flex flex-col gap-lg">
      <div className="flex items-center gap-sm md:hidden">
        <Link href="/domicilios" className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
        <h1 className="font-title-md text-title-md text-on-surface">Volver al menú</h1>
      </div>

      {/* Resumen del Pedido */}
      <section className="bg-surface-container-lowest rounded-2xl p-md shadow-soft-lift flex flex-col gap-md border border-outline-variant/30">
        <h2 className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider mb-xs">
          Resumen del Pedido
        </h2>
        <div className="flex flex-col gap-md">
          {cart.map((item) => (
            <div key={item.cartId} className="flex gap-md items-center border-b border-outline-variant/10 pb-sm last:border-0 last:pb-0">
              <div className="flex-1">
                <h3 className="font-label-sm text-label-sm text-on-surface">{item.nombre}</h3>
                {item.type === 'custom' && item.componentes ? (
                  <p className="font-caption text-caption text-on-surface-variant">
                    {item.componentes.arroz.nombre}, {item.componentes.proteina.nombre}, {item.componentes.acompanamiento.nombre}, {item.componentes.bebida.nombre}
                    {item.componentes.ensalada && `, Ensalada: ${item.componentes.ensalada.nombre}`}
                    {item.componentes.sopa && `, Sopa: ${item.componentes.sopa.nombre}`}
                    {item.componentes.postre && `, Postre: ${item.componentes.postre.nombre}`}
                  </p>
                ) : (
                  <p className="font-caption text-caption text-on-surface-variant line-clamp-1">
                    {item.observaciones || 'Sin especificaciones'}
                  </p>
                )}
                {/* Quantity Editor inside cart summary */}
                <div className="flex items-center gap-sm mt-sm">
                  <button
                    onClick={() => updateQuantity(item.cartId, item.cantidad - 1)}
                    className="w-6 h-6 rounded-full border border-outline flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <span className="font-caption font-bold w-4 text-center">{item.cantidad}</span>
                  <button
                    onClick={() => updateQuantity(item.cartId, item.cantidad + 1)}
                    className="w-6 h-6 rounded-full border border-outline flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.cartId)}
                    className="text-xs text-error font-semibold ml-md hover:underline cursor-pointer"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              <div className="font-label-sm text-label-sm text-primary shrink-0">
                ${(item.precio * item.cantidad).toLocaleString('es-CO')}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-outline-variant/30 pt-md mt-sm flex flex-col gap-sm">
          <div className="flex justify-between items-center text-caption font-medium">
            <span className="text-on-surface-variant">Subtotal platos</span>
            <span className="text-on-surface">${cartTotal.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between items-center text-caption font-medium">
            <span className="text-on-surface-variant">Domicilio</span>
            <span className="text-on-surface">${deliveryCost.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between items-center font-bold border-t border-outline-variant/20 pt-sm mt-xs">
            <span className="text-on-surface">Total Estimado</span>
            <span className="text-title-md text-primary font-bold">
              ${(cartTotal + deliveryCost).toLocaleString('es-CO')} COP
            </span>
          </div>
        </div>
      </section>

      <form onSubmit={handleCheckout} className="flex flex-col gap-lg">
        {/* Datos de Entrega */}
        <section className="bg-surface-container-lowest rounded-2xl p-md shadow-soft-lift flex flex-col gap-md border border-outline-variant/30">
          <div className="flex items-center gap-sm mb-xs">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              location_on
            </span>
            <h2 className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">
              Datos de Entrega
            </h2>
          </div>
          <div className="flex flex-col gap-sm">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                Nombre Completo <span className="text-error">*</span>
              </label>
              <input
                required
                value={nombre}
                onChange={(e) => {
                  setNombre(e.target.value);
                  if (errors.nombre) setErrors(prev => ({ ...prev, nombre: '' }));
                }}
                className={`w-full bg-surface border rounded-lg px-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 ${
                  errors.nombre ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary'
                }`}
                placeholder="Ej. María Pérez"
                type="text"
              />
              {errors.nombre && <p className="text-xs text-error mt-1 font-semibold">{errors.nombre}</p>}
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                Celular <span className="text-error">*</span>
              </label>
              <input
                required
                value={celular}
                onChange={(e) => {
                  setCelular(e.target.value);
                  if (errors.celular) setErrors(prev => ({ ...prev, celular: '' }));
                }}
                className={`w-full bg-surface border rounded-lg px-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 ${
                  errors.celular ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary'
                }`}
                placeholder="Ej. 300 123 4567"
                type="tel"
              />
              {errors.celular && <p className="text-xs text-error mt-1 font-semibold">{errors.celular}</p>}
            </div>
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                Dirección (Barranquilla / Soledad) <span className="text-error">*</span>
              </label>
              <input
                required
                value={direccion}
                onChange={(e) => {
                  setDireccion(e.target.value);
                  if (errors.direccion) setErrors(prev => ({ ...prev, direccion: '' }));
                }}
                className={`w-full bg-surface border rounded-lg px-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 ${
                  errors.direccion ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary'
                }`}
                placeholder="Ej. Cra 51B # 80 - 12"
                type="text"
              />
              {errors.direccion && <p className="text-xs text-error mt-1 font-semibold">{errors.direccion}</p>}
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                  Barrio <span className="text-error">*</span>
                </label>
                <input
                  required
                  value={barrio}
                  onChange={(e) => {
                    setBarrio(e.target.value);
                    if (errors.barrio) setErrors(prev => ({ ...prev, barrio: '' }));
                  }}
                  className={`w-full bg-surface border rounded-lg px-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 ${
                    errors.barrio ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary'
                  }`}
                  placeholder="Ej. El Prado"
                  type="text"
                />
                {errors.barrio && <p className="text-xs text-error mt-1 font-semibold">{errors.barrio}</p>}
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                  Referencia
                </label>
                <input
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40"
                  placeholder="Edificio, casa roja..."
                  type="text"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Momento de Entrega */}
        <section className="bg-surface-container-lowest rounded-2xl p-md shadow-soft-lift flex flex-col gap-md border border-outline-variant/30">
          <div className="flex items-center gap-sm mb-xs">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              schedule
            </span>
            <h2 className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">
              Momento de Entrega
            </h2>
          </div>
          
          <div className="flex gap-sm">
            <label className="flex-1 cursor-pointer">
              <input
                checked={deliveryType === 'inmediato'}
                onChange={() => {
                  setDeliveryType('inmediato');
                  setDeliveryDate('hoy');
                  setSelectedSlot('Inmediato');
                }}
                className="peer sr-only"
                name="delivery_type"
                type="radio"
              />
              <div className="text-center py-3 rounded-lg border border-outline-variant text-on-surface-variant font-label-sm peer-checked:bg-primary peer-checked:border-primary peer-checked:text-on-primary transition-all font-semibold">
                Lo antes posible
              </div>
            </label>
            <label className="flex-1 cursor-pointer">
              <input
                checked={deliveryType === 'programado'}
                onChange={() => {
                  setDeliveryType('programado');
                  setSelectedSlot('');
                }}
                className="peer sr-only"
                name="delivery_type"
                type="radio"
              />
              <div className="text-center py-3 rounded-lg border border-outline-variant text-on-surface-variant font-label-sm peer-checked:bg-primary peer-checked:border-primary peer-checked:text-on-primary transition-all font-semibold">
                Pedir para después
              </div>
            </label>
          </div>

          {deliveryType === 'programado' && (
            <div className="flex flex-col gap-md border-t border-outline-variant/10 pt-md animate-toast-in">
              {/* Fecha */}
              <div>
                <p className="font-caption text-caption text-on-surface-variant mb-xs">Fecha de entrega</p>
                <div className="flex gap-sm">
                  <label className="flex-1 cursor-pointer">
                    <input
                      checked={deliveryDate === 'hoy'}
                      onChange={() => setDeliveryDate('hoy')}
                      className="peer sr-only"
                      name="delivery_date"
                      type="radio"
                    />
                    <div className="text-center py-3 rounded-lg border border-outline-variant text-on-surface-variant font-label-sm peer-checked:bg-primary peer-checked:border-primary peer-checked:text-on-primary transition-all font-semibold">
                      Hoy
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer">
                    <input
                      checked={deliveryDate === 'manana'}
                      onChange={() => setDeliveryDate('manana')}
                      className="peer sr-only"
                      name="delivery_date"
                      type="radio"
                    />
                    <div className="text-center py-3 rounded-lg border border-outline-variant text-on-surface-variant font-label-sm peer-checked:bg-primary peer-checked:border-primary peer-checked:text-on-primary transition-all font-semibold">
                      Mañana
                    </div>
                  </label>
                </div>
              </div>

              {/* Franjas */}
              <div>
                <p className="font-caption text-caption text-on-surface-variant mb-xs">
                  Horario de entrega (Franjas de 15 min) <span className="text-error">*</span>
                </p>
                <div className="flex flex-wrap gap-xs">
                  {timeSlots.map((slot) => {
                    const isBlocked = slot === '10:45';
                    const isSelected = selectedSlot === slot;

                    return (
                      <button
                        key={slot}
                        disabled={isBlocked}
                        type="button"
                        onClick={() => {
                          setSelectedSlot(slot);
                          if (errors.selectedSlot) setErrors(prev => ({ ...prev, selectedSlot: '' }));
                        }}
                        className={`px-4 py-2 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                          isBlocked
                            ? 'border-outline-variant/30 text-on-surface-variant/30 bg-surface-container-low cursor-not-allowed line-through'
                            : isSelected
                            ? 'border-primary bg-primary text-on-primary shadow-sm'
                            : 'border-outline text-on-surface-variant hover:border-primary hover:text-primary bg-surface'
                        }`}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
                {errors.selectedSlot && <p className="text-xs text-error mt-1.5 font-semibold">{errors.selectedSlot}</p>}
              </div>
            </div>
          )}
        </section>

        {/* Método de Pago */}
        <section className="bg-surface-container-lowest rounded-2xl p-md shadow-soft-lift flex flex-col gap-md border border-outline-variant/30">
          <div className="flex items-center gap-sm mb-xs">
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              payments
            </span>
            <h2 className="font-label-sm text-label-sm text-on-surface uppercase tracking-wider">
              Método de Pago
            </h2>
          </div>
          <div className="flex flex-col gap-sm">
            {/* Efectivo */}
            <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer bg-surface transition-all ${
              paymentMethod === 'Efectivo'
                ? 'border-primary bg-primary-container/10 font-semibold'
                : 'border-outline hover:bg-surface-container-low'
            }`}>
              <input
                checked={paymentMethod === 'Efectivo'}
                onChange={() => setPaymentMethod('Efectivo')}
                className="w-5 h-5 text-primary border-outline focus:ring-primary"
                name="payment_method"
                type="radio"
              />
              <div className="ml-4 flex items-center gap-3">
                <span className="material-symbols-outlined text-on-surface-variant">local_atm</span>
                <span className="font-body-md text-on-surface">Efectivo contra entrega</span>
              </div>
            </label>
            {/* Transferencia */}
            <label className={`relative flex flex-col p-4 border rounded-xl cursor-pointer bg-surface transition-all ${
              paymentMethod === 'Transferencia'
                ? 'border-primary bg-primary-container/10'
                : 'border-outline hover:bg-surface-container-low'
            }`}>
              <div className="flex items-center">
                <input
                  checked={paymentMethod === 'Transferencia'}
                  onChange={() => setPaymentMethod('Transferencia')}
                  className="w-5 h-5 text-primary border-outline focus:ring-primary"
                  name="payment_method"
                  type="radio"
                />
                <div className="ml-4 flex items-center gap-3">
                  <span className="material-symbols-outlined text-on-surface-variant">account_balance</span>
                  <span className="font-body-md text-on-surface font-semibold">Transferencia (Nequi / Bancolombia)</span>
                </div>
              </div>
              
              {paymentMethod === 'Transferencia' && (
                <div className="mt-4 p-4 bg-surface-container rounded-lg border border-outline-variant border-dashed w-full" onClick={(e) => e.stopPropagation()}>
                  {/* Cuentas bancarias */}
                  <div className="flex flex-col gap-2 mb-4 bg-surface p-3 rounded-lg border border-outline-variant/30">
                    <p className="font-caption font-bold text-primary mb-1">Cuentas para transferencia:</p>
                    {bancos.length === 0 ? (
                      <p className="text-[10px] text-on-surface-variant">No hay cuentas de cobro registradas. Contacta al soporte para concretar el pago.</p>
                    ) : (
                      bancos.map((b, index) => (
                        <div key={index} className="flex flex-col text-[11px] pb-2 border-b border-outline-variant/10 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-primary">{b.banco}</span>
                            <span className="text-on-background">{b.numero}</span>
                          </div>
                          <span className="text-on-surface-variant font-medium">Titular: {b.titular}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <p className="font-caption text-caption text-on-surface-variant mb-3">
                    Adjunta el comprobante de pago para agilizar tu pedido.
                  </p>
                  
                  {receiptFile ? (
                    <div className="flex items-center justify-between bg-surface p-sm rounded-lg border border-outline">
                      <span className="font-caption font-semibold text-primary truncate max-w-[200px]">
                        {receiptFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReceiptFile(null)}
                        className="text-xs text-error font-bold hover:underline cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-3 bg-surface border border-outline rounded-lg font-label-sm text-on-surface flex justify-center items-center gap-2 hover:bg-surface-container-low transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-sm">upload_file</span>
                      Cargar Comprobante
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}
            </label>
          </div>
        </section>

        {/* Floating Action Button Area (Bottom Anchor) */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-surface/95 backdrop-blur-md border-t border-outline-variant/30 shadow-[0_-4px_12px_rgba(27,67,50,0.05)] pb-safe z-40">
          <div className="max-w-lg mx-auto">
            {!isLocalOpen && (
              <div className="bg-error-container/20 text-error p-3 mb-3 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 border border-error/20">
                <span className="material-symbols-outlined text-[18px]">block</span>
                El local está cerrado temporalmente en este momento. No se aceptan nuevos pedidos.
              </div>
            )}
            <button
              disabled={submitting || !isLocalOpen}
              type="submit"
              className="w-full bg-primary text-on-primary py-4 rounded-full font-label-sm text-label-sm shadow-soft-lift active:scale-[0.98] transition-transform flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>Registrando pedido...</>
              ) : (
                <>
                  Registrar pedido y continuar en WhatsApp
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
