'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'react-hot-toast';

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
    const days = ['cerrado', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
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
      toast.error('Por favor adjunta el comprobante de transferencia.');
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
            comps.sopa?.nombre
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
      toast.error(`Ocurrió un error al registrar el pedido: ${err.message || err}`);
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
      {/* Resumen del Pedido */}
      <section className="bg-surface rounded-3xl p-md md:p-lg shadow-sm border border-outline-variant/30 flex flex-col gap-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary">receipt_long</span>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">
            Tu Pedido
          </h2>
        </div>
        
        <div className="flex flex-col gap-sm">
          {cart.map((item) => (
            <div key={item.cartId} className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/20 flex flex-col gap-3 relative transition-all hover:shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-label-lg font-bold text-on-surface mb-1">{item.nombre}</h3>
                  {item.type === 'custom' && item.componentes ? (
                    <div className="flex flex-col gap-0.5">
                      <p className="font-caption text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary/50"></span> {item.componentes.arroz.nombre}
                      </p>
                      <p className="font-caption text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary/50"></span> {item.componentes.proteina.nombre}
                      </p>
                      <p className="font-caption text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary/50"></span> {item.componentes.acompanamiento.nombre}
                      </p>
                      <p className="font-caption text-xs text-on-surface-variant flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary/50"></span> {item.componentes.bebida.nombre}
                      </p>
                      {item.componentes.ensalada && (
                        <p className="font-caption text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-primary/50"></span> {item.componentes.ensalada.nombre}
                        </p>
                      )}
                      {item.componentes.sopa && (
                        <p className="font-caption text-xs text-on-surface-variant flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-primary/50"></span> {item.componentes.sopa.nombre}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="font-caption text-xs text-on-surface-variant italic">
                      {item.observaciones || 'Sin especificaciones'}
                    </p>
                  )}
                </div>
                <div className="font-title-sm font-bold text-primary shrink-0 text-right bg-primary/5 px-3 py-1.5 rounded-lg">
                  ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10 mt-1">
                <div className="flex items-center gap-3 bg-surface-container-high rounded-full p-1">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.cartId, item.cantidad - 1)}
                    className="w-8 h-8 rounded-full bg-surface text-on-surface shadow-sm flex items-center justify-center hover:bg-surface-container-lowest transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">remove</span>
                  </button>
                  <span className="font-body-md font-bold w-4 text-center">{item.cantidad}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.cartId, item.cantidad + 1)}
                    className="w-8 h-8 rounded-full bg-surface text-on-surface shadow-sm flex items-center justify-center hover:bg-surface-container-lowest transition-colors active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.cartId)}
                  className="text-xs font-bold text-error flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-error/10 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                  Quitar
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-surface-container-lowest p-md rounded-2xl border border-outline-variant/20 flex flex-col gap-sm mt-xs">
          <div className="flex justify-between items-center text-caption font-medium">
            <span className="text-on-surface-variant">Subtotal platos</span>
            <span className="text-on-surface font-bold">${cartTotal.toLocaleString('es-CO')}</span>
          </div>
          <div className="flex justify-between items-center text-caption font-medium">
            <span className="text-on-surface-variant">Domicilio</span>
            <span className="text-on-surface font-bold">${deliveryCost.toLocaleString('es-CO')}</span>
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
            <div className="relative">
              <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                Nombre Completo <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/50 text-[20px]">
                  person
                </span>
                <input
                  required
                  value={nombre}
                  onChange={(e) => {
                    setNombre(e.target.value);
                    if (errors.nombre) setErrors(prev => ({ ...prev, nombre: '' }));
                  }}
                  className={`w-full bg-surface border rounded-xl pl-10 pr-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 transition-colors ${
                    errors.nombre ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary ring-1 ring-transparent focus:ring-primary/20'
                  }`}
                  placeholder="Ej. María Pérez"
                  type="text"
                />
              </div>
              {errors.nombre && <p className="text-xs text-error mt-1 font-semibold">{errors.nombre}</p>}
            </div>
            
            <div className="relative">
              <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                Celular <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/50 text-[20px]">
                  call
                </span>
                <input
                  required
                  value={celular}
                  onChange={(e) => {
                    setCelular(e.target.value);
                    if (errors.celular) setErrors(prev => ({ ...prev, celular: '' }));
                  }}
                  className={`w-full bg-surface border rounded-xl pl-10 pr-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 transition-colors ${
                    errors.celular ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary ring-1 ring-transparent focus:ring-primary/20'
                  }`}
                  placeholder="Ej. 300 123 4567"
                  type="tel"
                />
              </div>
              {errors.celular && <p className="text-xs text-error mt-1 font-semibold">{errors.celular}</p>}
            </div>

            <div className="relative">
              <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                Dirección (Barranquilla / Soledad) <span className="text-error">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/50 text-[20px]">
                  home
                </span>
                <input
                  required
                  value={direccion}
                  onChange={(e) => {
                    setDireccion(e.target.value);
                    if (errors.direccion) setErrors(prev => ({ ...prev, direccion: '' }));
                  }}
                  className={`w-full bg-surface border rounded-xl pl-10 pr-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 transition-colors ${
                    errors.direccion ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary ring-1 ring-transparent focus:ring-primary/20'
                  }`}
                  placeholder="Ej. Cra 51B # 80 - 12"
                  type="text"
                />
              </div>
              {errors.direccion && <p className="text-xs text-error mt-1 font-semibold">{errors.direccion}</p>}
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div className="relative">
                <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                  Barrio <span className="text-error">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/50 text-[20px]">
                    signpost
                  </span>
                  <input
                    required
                    value={barrio}
                    onChange={(e) => {
                      setBarrio(e.target.value);
                      if (errors.barrio) setErrors(prev => ({ ...prev, barrio: '' }));
                    }}
                    className={`w-full bg-surface border rounded-xl pl-10 pr-4 py-3 font-body-md text-on-surface focus:outline-none placeholder:text-on-surface-variant/40 transition-colors ${
                      errors.barrio ? 'border-error focus:border-error ring-1 ring-error' : 'border-outline focus:border-primary ring-1 ring-transparent focus:ring-primary/20'
                    }`}
                    placeholder="Ej. El Prado"
                    type="text"
                  />
                </div>
                {errors.barrio && <p className="text-xs text-error mt-1 font-semibold">{errors.barrio}</p>}
              </div>
              
              <div className="relative">
                <label className="block font-label-sm text-label-sm text-on-surface mb-xs">
                  Referencia
                </label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-3 text-on-surface-variant/50 text-[20px]">
                    info
                  </span>
                  <input
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    className="w-full bg-surface border border-outline rounded-xl pl-10 pr-4 py-3 font-body-md text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 transition-colors ring-1 ring-transparent focus:ring-primary/20"
                    placeholder="Casa roja, apt 201..."
                    type="text"
                  />
                </div>
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
          
          <div className="flex bg-surface-container-high p-1 rounded-xl">
            <label className="flex-1 cursor-pointer relative">
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
              <div className="text-center py-2.5 rounded-lg text-on-surface-variant font-label-sm peer-checked:bg-surface peer-checked:text-primary peer-checked:shadow-sm transition-all font-bold z-10 relative">
                Lo antes posible
              </div>
            </label>
            <label className="flex-1 cursor-pointer relative">
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
              <div className="text-center py-2.5 rounded-lg text-on-surface-variant font-label-sm peer-checked:bg-surface peer-checked:text-primary peer-checked:shadow-sm transition-all font-bold z-10 relative">
                Pedir para después
              </div>
            </label>
          </div>

          {deliveryType === 'programado' && (
            <div className="flex flex-col gap-md border-t border-outline-variant/10 pt-md animate-card-in">
              {/* Fecha */}
              <div>
                <p className="font-caption text-caption text-on-surface-variant mb-xs">Fecha de entrega</p>
                <div className="flex bg-surface-container-high p-1 rounded-xl">
                  <label className="flex-1 cursor-pointer relative">
                    <input
                      checked={deliveryDate === 'hoy'}
                      onChange={() => setDeliveryDate('hoy')}
                      className="peer sr-only"
                      name="delivery_date"
                      type="radio"
                    />
                    <div className="text-center py-2.5 rounded-lg text-on-surface-variant font-label-sm peer-checked:bg-surface peer-checked:text-primary peer-checked:shadow-sm transition-all font-bold z-10 relative">
                      Hoy
                    </div>
                  </label>
                  <label className="flex-1 cursor-pointer relative">
                    <input
                      checked={deliveryDate === 'manana'}
                      onChange={() => setDeliveryDate('manana')}
                      className="peer sr-only"
                      name="delivery_date"
                      type="radio"
                    />
                    <div className="text-center py-2.5 rounded-lg text-on-surface-variant font-label-sm peer-checked:bg-surface peer-checked:text-primary peer-checked:shadow-sm transition-all font-bold z-10 relative">
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
            <label className={`relative flex items-center p-md border-2 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
              paymentMethod === 'Efectivo'
                ? 'border-primary bg-primary/5 shadow-soft-lift'
                : 'border-outline-variant/30 bg-surface hover:border-primary/30 hover:bg-surface-container-lowest hover:-translate-y-0.5'
            }`}>
              <input
                checked={paymentMethod === 'Efectivo'}
                onChange={() => setPaymentMethod('Efectivo')}
                className="peer sr-only"
                name="payment_method"
                type="radio"
              />
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'Efectivo' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                <span className="material-symbols-outlined text-[24px]">payments</span>
              </div>
              <div className="ml-4 flex flex-col">
                <span className={`font-body-md font-bold transition-colors ${paymentMethod === 'Efectivo' ? 'text-primary' : 'text-on-surface'}`}>Efectivo contra entrega</span>
                <span className="font-caption text-xs text-on-surface-variant">Paga al recibir tu almuerzo</span>
              </div>
              {paymentMethod === 'Efectivo' && (
                <span className="material-symbols-outlined absolute right-4 text-primary animate-pop-in">check_circle</span>
              )}
            </label>
            
            {/* Transferencia */}
            <label className={`relative flex flex-col p-md border-2 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden ${
              paymentMethod === 'Transferencia'
                ? 'border-primary bg-primary/5 shadow-soft-lift'
                : 'border-outline-variant/30 bg-surface hover:border-primary/30 hover:bg-surface-container-lowest hover:-translate-y-0.5'
            }`}>
              <div className="flex items-center">
                <input
                  checked={paymentMethod === 'Transferencia'}
                  onChange={() => setPaymentMethod('Transferencia')}
                  className="peer sr-only"
                  name="payment_method"
                  type="radio"
                />
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${paymentMethod === 'Transferencia' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                  <span className="material-symbols-outlined text-[24px]">account_balance</span>
                </div>
                <div className="ml-4 flex flex-col">
                  <span className={`font-body-md font-bold transition-colors ${paymentMethod === 'Transferencia' ? 'text-primary' : 'text-on-surface'}`}>Transferencia Digital</span>
                  <span className="font-caption text-xs text-on-surface-variant">Nequi o Bancolombia</span>
                </div>
                {paymentMethod === 'Transferencia' && (
                  <span className="material-symbols-outlined absolute right-4 text-primary animate-pop-in">check_circle</span>
                )}
              </div>
              
              {paymentMethod === 'Transferencia' && (
                <div className="mt-4 pt-4 border-t border-primary/10 w-full animate-slide-up-bar" onClick={(e) => e.stopPropagation()}>
                  {/* Cuentas bancarias */}
                  <div className="flex flex-col gap-2 mb-4 bg-surface p-4 rounded-xl border border-primary/10 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                    <p className="font-caption font-bold text-primary mb-1 uppercase tracking-wider text-[10px]">Cuentas autorizadas</p>
                    {bancos.length === 0 ? (
                      <p className="text-xs text-on-surface-variant italic">No hay cuentas configuradas actualmente.</p>
                    ) : (
                      bancos.map((b, index) => (
                        <div key={index} className="flex flex-col text-sm pb-2 border-b border-outline-variant/10 last:border-0 last:pb-0">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-primary">{b.banco}</span>
                            <span className="text-on-surface font-mono tracking-tight bg-surface-container-lowest px-2 py-0.5 rounded">{b.numero}</span>
                          </div>
                          <span className="text-xs text-on-surface-variant font-medium mt-1">Titular: {b.titular}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Uploader UI */}
                  {receiptFile ? (
                    <div className="flex items-center justify-between bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[16px]">task</span>
                        </div>
                        <span className="font-caption font-bold text-emerald-700 truncate max-w-[160px] md:max-w-[200px]">
                          {receiptFile.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptFile(null)}
                        className="w-8 h-8 rounded-full hover:bg-error/10 text-error flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-6 bg-surface border-2 border-dashed border-primary/30 rounded-xl flex flex-col justify-center items-center gap-2 hover:bg-primary/5 hover:border-primary transition-colors cursor-pointer group">
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined">cloud_upload</span>
                      </div>
                      <div className="text-center">
                        <p className="font-label-sm text-primary font-bold">Toca para cargar tu comprobante</p>
                        <p className="font-caption text-xs text-on-surface-variant mt-1">Formatos de imagen soportados</p>
                      </div>
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

        <div className="fixed bottom-0 left-0 w-full bg-surface-container-lowest/80 backdrop-blur-xl border-t-2 border-primary/10 shadow-[0_-10px_40px_-10px_rgba(27,67,50,0.15)] pb-safe z-40 p-4">
          <div className="max-w-lg mx-auto">
            {!isLocalOpen && (
              <div className="bg-error-container/20 text-error p-3 mb-3 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5 border border-error/20">
                <span className="material-symbols-outlined text-[18px]">block</span>
                El local está cerrado temporalmente en este momento. No se aceptan nuevos pedidos.
              </div>
            )}
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col">
                <span className="font-caption text-[10px] uppercase font-bold text-on-surface-variant tracking-wider">Total a pagar</span>
                <span className="font-display-lg text-2xl font-black text-primary leading-none">${(cartTotal + deliveryCost).toLocaleString('es-CO')}</span>
              </div>
              
              <button
                disabled={submitting || (cartTotal === 0 && deliveryCost === 0) || !isLocalOpen}
                className={`flex-1 py-3.5 px-6 rounded-full font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
                  submitting || !isLocalOpen
                    ? 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                    : 'bg-primary text-on-primary hover:bg-primary-container cursor-pointer'
                }`}
                type="submit"
              >
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                    Registrando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    Registrar y pedir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
