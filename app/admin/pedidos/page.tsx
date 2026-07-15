'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  tiempo_estimado?: number;
  creado_a: string;
}

interface Comprobante {
  url_archivo: string;
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<OrderDetail[]>([]);
  const [selectedComprobante, setSelectedComprobante] = useState<Comprobante | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmOrderTarget, setConfirmOrderTarget] = useState<Order | null>(null);
  const [tiempoEstimadoInput, setTiempoEstimadoInput] = useState('45');

  // Search and filter
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch orders initially
  useEffect(() => {
    async function fetchOrders() {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('creado_a', { ascending: false });

      if (data) {
        setOrders(data as Order[]);
      }
    }

    fetchOrders();

    // Subscribe to realtime orders updates
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders((prev) =>
              prev.map((o) => (o.codigo === payload.new.codigo ? (payload.new as Order) : o))
            );
            setSelectedOrder((prev) =>
              prev && prev.codigo === payload.new.codigo ? (payload.new as Order) : prev
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders((prev) => prev.filter((o) => o.codigo !== payload.old.codigo));
            setSelectedOrder((prev) => (prev && prev.codigo === payload.old.codigo ? null : prev));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch details when selecting an order
  useEffect(() => {
    if (!selectedOrder) {
      setSelectedDetails([]);
      setSelectedComprobante(null);
      return;
    }

    async function fetchDetails() {
      if (!selectedOrder) return;
      setLoadingDetails(true);
      try {
        // Fetch items
        const { data: detailsData } = await supabase
          .from('detalles_pedido')
          .select('*')
          .eq('pedido_codigo', selectedOrder.codigo);

        if (detailsData) {
          setSelectedDetails(detailsData as OrderDetail[]);
        }

        // Fetch receipt if Transfer
        if (selectedOrder.metodo_pago === 'Transferencia') {
          const { data: compData } = await supabase
            .from('comprobantes')
            .select('url_archivo')
            .eq('pedido_codigo', selectedOrder.codigo)
            .single();

          if (compData) {
            setSelectedComprobante(compData);
          } else {
            setSelectedComprobante(null);
          }
        } else {
          setSelectedComprobante(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDetails(false);
      }
    }

    fetchDetails();
  }, [selectedOrder]);

  // Stock deduction helper
  const deductStock = async (orderCode: string) => {
    try {
      // 1. Fetch details of order
      const { data: items, error: fetchErr } = await supabase
        .from('detalles_pedido')
        .select('*')
        .eq('pedido_codigo', orderCode);

      if (fetchErr || !items) return;

      for (const item of items) {
        if (item.componentes) {
          // Custom plate "Ármate un plato"
          // Decrement stock of each selected option ID
          const selections = Object.values(item.componentes) as any[];
          for (const selection of selections) {
            if (selection && selection.id) {
              const { data: opt } = await supabase
                .from('opciones_plato')
                .select('stock')
                .eq('id', selection.id)
                .single();

              if (opt) {
                const newStock = Math.max(0, opt.stock - item.cantidad);
                await supabase
                  .from('opciones_plato')
                  .update({ stock: newStock })
                  .eq('id', selection.id);
              }
            }
          }
        } else {
          // Prepared plate or drink (productos table)
          const { data: prod } = await supabase
            .from('productos')
            .select('stock')
            .eq('nombre', item.nombre)
            .single();

          if (prod) {
            const newStock = Math.max(0, prod.stock - item.cantidad);
            await supabase
              .from('productos')
              .update({ stock: newStock })
              .eq('nombre', item.nombre);
          }
        }
      }
    } catch (err) {
      console.error('Error deducting stock:', err);
    }
  };

  // Confirm order execution
  const executeConfirm = async () => {
    if (!confirmOrderTarget) return;

    try {
      const mins = parseInt(tiempoEstimadoInput, 10) || 45;
      
      // Update order state
      const { error } = await supabase
        .from('pedidos')
        .update({
          estado: 'Confirmado',
          tiempo_estimado: mins
        })
        .eq('codigo', confirmOrderTarget.codigo);

      if (error) throw error;

      // Deduct stock
      await deductStock(confirmOrderTarget.codigo);

      // Open WhatsApp notification
      const msg = `¡Hola ${confirmOrderTarget.cliente}! Tu pedido ${confirmOrderTarget.codigo} en Super IN ha sido confirmado. Llegará en aproximadamente ${mins} minutos a la dirección: ${confirmOrderTarget.direccion}. ¡Muchas gracias por tu compra!`;
      const waUrl = `https://wa.me/${confirmOrderTarget.celular.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');

      setShowConfirmModal(false);
      setConfirmOrderTarget(null);
    } catch (err: any) {
      alert(`Error al confirmar pedido: ${err.message}`);
    }
  };

  const handleUpdateStatus = async (code: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: newStatus })
        .eq('codigo', code);

      if (error) throw error;
    } catch (err: any) {
      alert(`Error al actualizar estado: ${err.message}`);
    }
  };

  const handleRejectOrder = async (code: string) => {
    const confirmReject = confirm('¿Estás seguro de que deseas rechazar este pedido?');
    if (!confirmReject) return;

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ estado: 'Cancelado' })
        .eq('codigo', code);

      if (error) throw error;
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter orders by search
  const filteredOrders = orders.filter(
    (o) =>
      o.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.direccion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group by columns
  const getOrdersByState = (state: string) => {
    return filteredOrders.filter((o) => o.estado === state);
  };

  // KPIs
  const kpis = {
    pendientes: orders.filter((o) => o.estado === 'Pendiente de confirmación').length,
    preparacion: orders.filter((o) => o.estado === 'En preparación').length,
    camino: orders.filter((o) => o.estado === 'En camino').length,
    ventasHoy: orders
      .filter((o) => o.estado === 'Entregado')
      .reduce((sum, o) => sum + o.total, 0)
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="h-20 px-lg flex items-center justify-between border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md z-10 flex-shrink-0">
        <div>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">Resumen de Pedidos</h2>
          <p className="font-caption text-caption text-on-surface-variant">Operación en tiempo real</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar por código o cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline rounded-full font-body-md text-sm focus:border-primary focus:outline-none placeholder:text-outline-variant"
            />
          </div>
        </div>
      </header>

      {/* Workspace Area split into columns + Details Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-lg flex gap-lg bg-surface-container-low/20">
          <div className="flex-1 min-w-[1200px] flex gap-lg">
            {/* Column: Pendientes */}
            <div className="flex-1 flex flex-col gap-sm max-w-sm">
              <div className="flex items-center justify-between pb-2 border-b border-error/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
                  Pendientes ({getOrdersByState('Pendiente de confirmación').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('Pendiente de confirmación').map((o) => (
                  <div
                    key={o.codigo}
                    onClick={() => setSelectedOrder(o)}
                    className={`bg-surface-container-lowest p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                      selectedOrder?.codigo === o.codigo
                        ? 'border-primary ring-2 ring-primary-container/20'
                        : 'border-outline-variant/30 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-primary font-mono">{o.codigo}</span>
                      <span className="text-[10px] text-error font-semibold bg-error-container/20 px-2 py-0.5 rounded-full">
                        NUEVO
                      </span>
                    </div>
                    <h4 className="font-semibold text-on-background text-sm mb-1">{o.cliente}</h4>
                    <p className="text-xs text-on-surface-variant mb-2 truncate flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      {o.direccion} ({o.barrio})
                    </p>
                    <div className="flex justify-between items-center text-xs font-semibold pt-2 border-t border-outline-variant/10">
                      <span className="bg-surface-variant px-2.5 py-0.5 rounded-full text-[10px]">
                        {o.franja}
                      </span>
                      <span className="text-primary font-bold">${o.total.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmOrderTarget(o);
                          setShowConfirmModal(true);
                        }}
                        className="flex-1 bg-primary text-on-primary text-xs font-bold py-1.5 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRejectOrder(o.codigo);
                        }}
                        className="border border-error text-error text-xs font-bold px-3 py-1.5 rounded-full hover:bg-error-container/10 cursor-pointer transition-all"
                      >
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column: Confirmados */}
            <div className="flex-1 flex flex-col gap-sm max-w-sm">
              <div className="flex items-center justify-between pb-2 border-b border-secondary/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  Confirmados ({getOrdersByState('Confirmado').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('Confirmado').map((o) => (
                  <div
                    key={o.codigo}
                    onClick={() => setSelectedOrder(o)}
                    className={`bg-surface-container-lowest p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                      selectedOrder?.codigo === o.codigo
                        ? 'border-primary ring-2 ring-primary-container/20'
                        : 'border-outline-variant/30 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-primary font-mono">{o.codigo}</span>
                      {o.tiempo_estimado && (
                        <span className="text-[10px] text-primary font-bold bg-primary-container/10 px-2 py-0.5 rounded-full">
                          {o.tiempo_estimado} min
                        </span>
                      )}
                    </div>
                    <h4 className="font-semibold text-on-background text-sm mb-1">{o.cliente}</h4>
                    <p className="text-xs text-on-surface-variant mb-2 truncate flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      {o.direccion} ({o.barrio})
                    </p>
                    <div className="flex justify-between items-center text-xs font-semibold pt-2 border-t border-outline-variant/10">
                      <span className="bg-surface-variant px-2.5 py-0.5 rounded-full text-[10px]">
                        {o.franja}
                      </span>
                      <span className="text-primary font-bold">${o.total.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(o.codigo, 'En preparación');
                        }}
                        className="w-full bg-secondary text-on-secondary text-xs font-bold py-1.5 rounded-full hover:opacity-90 cursor-pointer transition-all"
                      >
                        Enviar a Cocina
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column: En Preparación */}
            <div className="flex-1 flex flex-col gap-sm max-w-sm">
              <div className="flex items-center justify-between pb-2 border-b border-primary/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                  En Cocina ({getOrdersByState('En preparación').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('En preparación').map((o) => (
                  <div
                    key={o.codigo}
                    onClick={() => setSelectedOrder(o)}
                    className={`bg-surface-container-lowest p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                      selectedOrder?.codigo === o.codigo
                        ? 'border-primary ring-2 ring-primary-container/20'
                        : 'border-outline-variant/30 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-primary font-mono">{o.codigo}</span>
                    </div>
                    <h4 className="font-semibold text-on-background text-sm mb-1">{o.cliente}</h4>
                    <p className="text-xs text-on-surface-variant mb-2 truncate flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      {o.direccion} ({o.barrio})
                    </p>
                    <div className="flex justify-between items-center text-xs font-semibold pt-2 border-t border-outline-variant/10">
                      <span className="bg-surface-variant px-2.5 py-0.5 rounded-full text-[10px]">
                        {o.franja}
                      </span>
                      <span className="text-primary font-bold">${o.total.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(o.codigo, 'En camino');
                        }}
                        className="w-full bg-primary-container text-on-primary text-xs font-bold py-1.5 rounded-full hover:opacity-90 cursor-pointer transition-all"
                      >
                        Listo / Despachar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column: En Camino */}
            <div className="flex-1 flex flex-col gap-sm max-w-sm">
              <div className="flex items-center justify-between pb-2 border-b border-primary/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  En Reparto ({getOrdersByState('En camino').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('En camino').map((o) => (
                  <div
                    key={o.codigo}
                    onClick={() => setSelectedOrder(o)}
                    className={`bg-surface-container-lowest p-4 rounded-xl border transition-all cursor-pointer shadow-sm ${
                      selectedOrder?.codigo === o.codigo
                        ? 'border-primary ring-2 ring-primary-container/20'
                        : 'border-outline-variant/30 hover:shadow-md'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-primary font-mono">{o.codigo}</span>
                    </div>
                    <h4 className="font-semibold text-on-background text-sm mb-1">{o.cliente}</h4>
                    <p className="text-xs text-on-surface-variant mb-2 truncate flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">location_on</span>
                      {o.direccion} ({o.barrio})
                    </p>
                    <div className="flex justify-between items-center text-xs font-semibold pt-2 border-t border-outline-variant/10">
                      <span className="bg-surface-variant px-2.5 py-0.5 rounded-full text-[10px]">
                        {o.franja}
                      </span>
                      <span className="text-primary font-bold">${o.total.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex gap-2 mt-3 pt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStatus(o.codigo, 'Entregado');
                        }}
                        className="w-full bg-primary text-on-primary text-xs font-bold py-1.5 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                      >
                        Marcar Entregado
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Side Details Panel */}
        {selectedOrder ? (
          <aside className="w-[420px] border-l border-outline-variant/30 bg-surface-container-lowest flex flex-col h-full flex-shrink-0 z-10">
            <div className="p-lg border-b border-outline-variant/30 flex justify-between items-center">
              <div>
                <h3 className="font-title-md text-primary font-bold font-mono">{selectedOrder.codigo}</h3>
                <p className="text-xs text-on-surface-variant">Creado: {new Date(selectedOrder.creado_a).toLocaleTimeString('es-CO')}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-on-surface">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-lg flex flex-col gap-md">
              {/* Cliente */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Datos del Cliente
                </h4>
                <div className="bg-surface-container-low p-md rounded-xl text-xs flex flex-col gap-2">
                  <p><strong>Nombre:</strong> {selectedOrder.cliente}</p>
                  <p><strong>Celular:</strong> {selectedOrder.celular}</p>
                  <p><strong>Dirección:</strong> {selectedOrder.direccion} ({selectedOrder.barrio})</p>
                  {selectedOrder.referencia && <p><strong>Indicaciones:</strong> {selectedOrder.referencia}</p>}
                </div>
              </div>

              {/* Entrega y Pago */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Entrega y Pago
                </h4>
                <div className="bg-surface-container-low p-md rounded-xl text-xs flex flex-col gap-2">
                  <p><strong>Franja Horaria:</strong> {selectedOrder.franja}</p>
                  <p><strong>Método de Pago:</strong> {selectedOrder.metodo_pago}</p>
                  <p><strong>Estado Actual:</strong> <span className="font-bold text-primary">{selectedOrder.estado}</span></p>
                </div>
              </div>

              {/* Comprobante de Pago */}
              {selectedOrder.metodo_pago === 'Transferencia' && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Comprobante de Transferencia
                  </h4>
                  {selectedComprobante ? (
                    <div className="border border-outline-variant/30 rounded-xl overflow-hidden mt-1">
                      <a href={selectedComprobante.url_archivo} target="_blank" rel="noopener noreferrer">
                        <img
                          src={selectedComprobante.url_archivo}
                          alt="Comprobante Nequi/Bancolombia"
                          className="w-full h-40 object-contain bg-black/5 hover:opacity-90 cursor-pointer"
                        />
                      </a>
                      <p className="text-[10px] text-center text-on-surface-variant py-1 bg-surface-container-low">
                        Click para ver en tamaño completo
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-error italic">Aún no se ha cargado el comprobante.</p>
                  )}
                </div>
              )}

              {/* Productos */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Productos
                </h4>
                <div className="flex flex-col gap-2">
                  {loadingDetails ? (
                    <div className="text-center py-sm">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    selectedDetails.map((item) => (
                      <div key={item.id} className="bg-surface-container-low p-sm rounded-lg flex flex-col text-xs">
                        <div className="flex justify-between font-bold">
                          <span>
                            {item.nombre} <span className="text-primary font-normal">x{item.cantidad}</span>
                          </span>
                          <span>${(item.precio * item.cantidad).toLocaleString('es-CO')}</span>
                        </div>
                        {item.componentes && (
                          <div className="mt-1 text-[11px] text-on-surface-variant">
                            {Object.entries(item.componentes)
                              .map(([_, comp]: any) => comp?.nombre)
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        )}
                        {item.observaciones && (
                          <p className="mt-1 text-[11px] text-error italic">Obs: {item.observaciones}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-lg border-t border-outline-variant/30 bg-surface flex flex-col gap-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">Total del Pedido:</span>
                <span className="font-headline-lg-mobile text-primary font-bold">
                  ${selectedOrder.total.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://wa.me/${selectedOrder.celular.replace(/\+/g, '')}?text=${encodeURIComponent(
                    `Hola ${selectedOrder.cliente}, me contacto del restaurante Super IN sobre tu pedido ${selectedOrder.codigo}...`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-[#25D366] text-white text-xs font-bold py-3 rounded-full flex items-center justify-center gap-1 hover:bg-[#1EBE5C] transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  WhatsApp
                </a>

                {selectedOrder.estado === 'Pendiente de confirmación' && (
                  <button
                    onClick={() => {
                      setConfirmOrderTarget(selectedOrder);
                      setShowConfirmModal(true);
                    }}
                    className="flex-1 bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                  >
                    Confirmar Pedido
                  </button>
                )}
              </div>
            </div>
          </aside>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-center text-on-surface-variant/40">
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-[64px] mb-sm">toc</span>
              <p className="font-semibold text-sm">Selecciona un pedido para ver los detalles</p>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Tiempo Estimado Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full p-lg rounded-2xl border border-outline-variant shadow-xl flex flex-col gap-md">
            <h3 className="font-title-md text-primary font-bold">Confirmar Pedido</h3>
            <p className="text-xs text-on-surface-variant">
              Por favor ingresa el tiempo estimado de entrega en minutos para notificar al cliente:
            </p>

            <div className="flex items-center gap-sm">
              <input
                type="number"
                value={tiempoEstimadoInput}
                onChange={(e) => setTiempoEstimadoInput(e.target.value)}
                className="w-full bg-surface border border-outline rounded-lg px-3 py-2 font-mono font-bold text-center"
              />
              <span className="text-xs font-semibold text-on-surface">minutos</span>
            </div>

            <div className="flex gap-sm mt-lg">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmOrderTarget(null);
                }}
                className="flex-1 border border-outline text-on-surface text-xs font-bold py-3 rounded-full hover:bg-surface-container-high transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirm}
                className="flex-1 bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container transition-all"
              >
                Confirmar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
