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

interface TopDish {
  nombre: string;
  cantidad: number;
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
  
  // Mobile active column state
  const [activeMobileCol, setActiveMobileCol] = useState<string>('Pendiente de confirmación');

  // Local status (abierto/cerrado)
  const [localAbierto, setLocalAbierto] = useState(true);
  const [loadingLocalStatus, setLoadingLocalStatus] = useState(false);

  // Stats collapsible view
  const [showStats, setShowStats] = useState(false);
  const [topDishes, setTopDishes] = useState<TopDish[]>([]);

  // Sound play helper (Synthesizes dual tone bell sound)
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain2.gain.setValueAtTime(0.4, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.45);
      }, 120);
    } catch (e) {
      console.error('Audio play blocked or unsupported:', e);
    }
  };

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

    async function fetchLocalStatus() {
      try {
        const { data } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'horarios_servicio')
          .single();
        if (data && data.valor && typeof data.valor === 'object' && 'abierto' in data.valor) {
          setLocalAbierto((data.valor as any).abierto);
        }
      } catch (err) {
        console.error('Error fetching local status:', err);
      }
    }

    async function fetchTopDishes() {
      try {
        const { data } = await supabase
          .from('detalles_pedido')
          .select('nombre, cantidad');
        if (data) {
          const dishMap: { [name: string]: number } = {};
          data.forEach((item: any) => {
            dishMap[item.nombre] = (dishMap[item.nombre] || 0) + item.cantidad;
          });
          const sorted = Object.entries(dishMap)
            .map(([nombre, cantidad]) => ({ nombre, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 3);
          setTopDishes(sorted);
        }
      } catch (e) {
        console.error('Error fetching top dishes:', e);
      }
    }

    fetchOrders();
    fetchLocalStatus();
    fetchTopDishes();

    // Subscribe to realtime orders updates
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders((prev) => [payload.new as Order, ...prev]);
            if (payload.new.estado === 'Pendiente de confirmación') {
              playNotificationSound();
            }
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

  const handleToggleLocalStatus = async () => {
    setLoadingLocalStatus(true);
    const newStatus = !localAbierto;
    try {
      const { data } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'horarios_servicio')
        .single();
      const currentVal = data?.valor as any || { hora_inicio: '10:00', hora_fin: '15:00' };
      const newVal = { ...currentVal, abierto: newStatus };
      
      const { error } = await supabase
        .from('configuracion')
        .upsert({ clave: 'horarios_servicio', valor: newVal });
        
      if (error) throw error;
      setLocalAbierto(newStatus);
    } catch (err: any) {
      alert('Error al actualizar estado del local: ' + err.message);
    } finally {
      setLoadingLocalStatus(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const { data: allOrders, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('creado_a', { ascending: false });

      if (error || !allOrders) throw new Error('Error al obtener pedidos');

      let csvContent = '\uFEFF'; // UTF-8 BOM
      csvContent += 'Código,Cliente,Celular,Dirección,Barrio,Fecha,Franja,Estado,Subtotal,Domicilio,Total,Método de Pago,Fecha Creación\n';

      allOrders.forEach((o) => {
        const row = [
          o.codigo,
          `"${o.cliente.replace(/"/g, '""')}"`,
          o.celular,
          `"${o.direccion.replace(/"/g, '""')}"`,
          `"${o.barrio.replace(/"/g, '""')}"`,
          o.fecha,
          o.franja,
          o.estado,
          o.subtotal,
          o.domicilio,
          o.total,
          o.metodo_pago,
          new Date(o.creado_a).toLocaleString('es-CO')
        ].join(',');
        csvContent += row + '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Error al exportar reporte: ' + err.message);
    }
  };

  const getLast7DaysSales = () => {
    const salesMap: { [dateStr: string]: number } = {};
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      salesMap[dateStr] = 0;
      days.push({
        dateStr,
        label: d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }),
      });
    }

    orders.forEach((o) => {
      if (o.estado === 'Entregado') {
        const orderDateStr = o.creado_a.split('T')[0];
        if (orderDateStr in salesMap) {
          salesMap[orderDateStr] += o.total;
        }
      }
    });

    return days.map(day => ({
      ...day,
      total: salesMap[day.dateStr] || 0
    }));
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
  const isToday = (dateStr: string) => {
    const orderDate = new Date(dateStr);
    const today = new Date();
    return (
      orderDate.getDate() === today.getDate() &&
      orderDate.getMonth() === today.getMonth() &&
      orderDate.getFullYear() === today.getFullYear()
    );
  };

  const kpis = {
    pendientes: orders.filter((o) => o.estado === 'Pendiente de confirmación').length,
    preparacion: orders.filter((o) => o.estado === 'En preparación' || o.estado === 'Confirmado').length,
    camino: orders.filter((o) => o.estado === 'En camino').length,
    ventasHoy: orders
      .filter((o) => o.estado === 'Entregado' && isToday(o.creado_a))
      .reduce((sum, o) => sum + o.total, 0),
    total: orders.length
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="h-20 px-lg flex items-center justify-between border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md z-10 flex-shrink-0">
        <div>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">Resumen de Pedidos</h2>
          <p className="font-caption text-caption text-on-surface-variant">Operación en tiempo real</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Emergency Stop Button */}
          <button
            onClick={handleToggleLocalStatus}
            disabled={loadingLocalStatus}
            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all border cursor-pointer ${
              localAbierto
                ? 'bg-success-container/20 border-success/30 text-[#2e7d32] hover:bg-success-container/40'
                : 'bg-error-container/20 border-error/30 text-error hover:bg-error-container/40 animate-pulse'
            }`}
            title={localAbierto ? 'Haga clic para cerrar el recibo de pedidos' : 'Haga clic para abrir el recibo de pedidos'}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${localAbierto ? 'bg-[#2e7d32]' : 'bg-error'}`}></span>
            {localAbierto ? 'Local Abierto' : 'Local Cerrado'}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1 bg-surface-container-lowest border border-outline text-on-surface hover:bg-surface-container-low transition-all cursor-pointer shadow-sm"
            title="Exportar ventas a archivo CSV"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Exportar Reporte
          </button>

          {/* Toggle Stats Button */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1 border transition-all cursor-pointer shadow-sm ${
              showStats
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest border border-outline text-on-surface hover:bg-surface-container-low'
            }`}
            title="Ver estadísticas de los últimos 7 días y platos estrella"
          >
            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
            {showStats ? 'Ocultar Estadísticas' : 'Ver Estadísticas'}
          </button>

          {/* Search bar */}
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

      {/* Collapsible Stats Dashboard */}
      {showStats && (
        <div className="bg-surface-container-low/60 px-lg py-6 border-b border-outline-variant/30 grid grid-cols-1 md:grid-cols-2 gap-lg flex-shrink-0 transition-all duration-300">
          {/* Sales chart card */}
          <div className="bg-surface p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-lg">trending_up</span>
              Ventas de los Últimos 7 Días (Entregados)
            </h3>
            
            <div className="flex-1 min-h-[160px] flex items-end gap-3 pt-4 px-2 border-b border-outline-variant/30 pb-2">
              {getLast7DaysSales().map((day) => {
                const maxVal = Math.max(...getLast7DaysSales().map(d => d.total), 1);
                const percent = (day.total / maxVal) * 100;
                
                return (
                  <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-on-surface text-surface text-[10px] font-bold px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none z-10">
                      ${day.total.toLocaleString('es-CO')}
                    </div>
                    
                    {/* Bar */}
                    <div className="w-full bg-surface-container-high rounded-t-md overflow-hidden flex items-end min-h-[10px] h-[120px]">
                      <div 
                        style={{ height: `${percent}%` }}
                        className={`w-full rounded-t-md transition-all duration-500 ${
                          day.total > 0 ? 'bg-primary hover:bg-primary/80' : 'bg-outline-variant/30'
                        }`}
                      />
                    </div>
                    
                    {/* Label */}
                    <span className="text-[10px] text-on-surface-variant font-bold capitalize select-none text-center">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Products card */}
          <div className="bg-surface p-6 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-lg">workspace_premium</span>
                Platos Estrella (Top Pedidos)
              </h3>
              
              <div className="flex flex-col gap-3">
                {topDishes.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic py-4">No hay datos de pedidos registrados aún.</p>
                ) : (
                  topDishes.map((dish, index) => {
                    const colors = ['text-yellow-500', 'text-slate-400', 'text-amber-600'];
                    const rankBgs = ['bg-yellow-500/10', 'bg-slate-400/10', 'bg-amber-600/10'];
                    
                    return (
                      <div key={dish.nombre} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/10 font-sans">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${rankBgs[index]} ${colors[index]}`}>
                            #{index + 1}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-on-background block">{dish.nombre}</span>
                            <span className="text-[10px] text-on-surface-variant">Total ordenado</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold">
                          {dish.cantidad} unidades
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-on-surface-variant/70 italic mt-4 pt-2 border-t border-outline-variant/10">
              Calculado automáticamente sobre todos los registros históricos de pedidos.
            </p>
          </div>
        </div>
      )}

      {/* KPIs Summary Bar */}
      <section className="bg-surface-container-low/40 px-lg py-3 border-b border-outline-variant/30 flex gap-4 overflow-x-auto flex-shrink-0">
        {/* Card: Recaudado Hoy */}
        <div className="flex-1 min-w-[200px] bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success-container/30 text-success flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">payments</span>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Recaudado Hoy</span>
            <span className="text-xl font-extrabold text-on-background font-mono">${kpis.ventasHoy.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* Card: Pedidos Pendientes */}
        <div className="flex-1 min-w-[180px] bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">pending_actions</span>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Pendientes</span>
            <span className="text-xl font-extrabold text-on-background font-mono">{kpis.pendientes}</span>
          </div>
        </div>

        {/* Card: En Cocina */}
        <div className="flex-1 min-w-[180px] bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">skillet</span>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">En Cocina</span>
            <span className="text-xl font-extrabold text-on-background font-mono">{kpis.preparacion}</span>
          </div>
        </div>

        {/* Card: En Camino */}
        <div className="flex-1 min-w-[180px] bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-secondary-container/30 text-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">two_wheeler</span>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">En Camino</span>
            <span className="text-xl font-extrabold text-on-background font-mono">{kpis.camino}</span>
          </div>
        </div>

        {/* Card: Total Pedidos */}
        <div className="flex-1 min-w-[180px] bg-surface p-4 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high/60 text-on-surface flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl font-bold">receipt_long</span>
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider block">Total Pedidos</span>
            <span className="text-xl font-extrabold text-on-background font-mono">{kpis.total}</span>
          </div>
        </div>
      </section>

      {/* Mobile Column Tabs Switcher */}
      <div className="lg:hidden flex bg-surface-container px-lg border-b border-outline-variant/30 flex-shrink-0 overflow-x-auto gap-2">
        {[
          { label: 'Pendientes', state: 'Pendiente de confirmación', count: getOrdersByState('Pendiente de confirmación').length, color: 'bg-error' },
          { label: 'Confirmados', state: 'Confirmado', count: getOrdersByState('Confirmado').length, color: 'bg-secondary' },
          { label: 'En Cocina', state: 'En preparación', count: getOrdersByState('En preparación').length, color: 'bg-primary-container' },
          { label: 'En Reparto', state: 'En camino', count: getOrdersByState('En camino').length, color: 'bg-primary' },
          { label: 'Entregados', state: 'Entregado', count: getOrdersByState('Entregado').length, color: 'bg-[#2e7d32]' }
        ].map((tab) => (
          <button
            key={tab.state}
            onClick={() => setActiveMobileCol(tab.state)}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeMobileCol === tab.state ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${tab.color}`}></span>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Workspace Area split into columns + Details Side Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-lg bg-surface-container-low/20">
          <div className="min-w-0 lg:min-w-[1400px] h-full flex flex-col lg:flex-row gap-lg justify-start">
            {/* Column: Pendientes */}
            <div className={`flex-1 flex flex-col gap-sm lg:max-w-xs ${activeMobileCol === 'Pendiente de confirmación' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-error/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
                  Pendientes ({getOrdersByState('Pendiente de confirmación').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('Pendiente de confirmación').length === 0 ? (
                  <div className="text-center py-lg text-on-surface-variant/40 text-xs italic">
                    Sin pedidos pendientes
                  </div>
                ) : (
                  getOrdersByState('Pendiente de confirmación').map((o) => (
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
                  ))
                )}
              </div>
            </div>

            {/* Column: Confirmados */}
            <div className={`flex-1 flex flex-col gap-sm lg:max-w-xs ${activeMobileCol === 'Confirmado' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-secondary/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                  Confirmados ({getOrdersByState('Confirmado').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('Confirmado').length === 0 ? (
                  <div className="text-center py-lg text-on-surface-variant/40 text-xs italic">
                    Sin pedidos confirmados
                  </div>
                ) : (
                  getOrdersByState('Confirmado').map((o) => (
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
                  ))
                )}
              </div>
            </div>

            {/* Column: En Cocina */}
            <div className={`flex-1 flex flex-col gap-sm lg:max-w-xs ${activeMobileCol === 'En preparación' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-primary-container/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                  En Cocina ({getOrdersByState('En preparación').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('En preparación').length === 0 ? (
                  <div className="text-center py-lg text-on-surface-variant/40 text-xs italic">
                    Sin pedidos en cocina
                  </div>
                ) : (
                  getOrdersByState('En preparación').map((o) => (
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
                  ))
                )}
              </div>
            </div>

            {/* Column: En Reparto */}
            <div className={`flex-1 flex flex-col gap-sm lg:max-w-xs ${activeMobileCol === 'En camino' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-primary/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  En Reparto ({getOrdersByState('En camino').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('En camino').length === 0 ? (
                  <div className="text-center py-lg text-on-surface-variant/40 text-xs italic">
                    Sin pedidos en reparto
                  </div>
                ) : (
                  getOrdersByState('En camino').map((o) => (
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
                  ))
                )}
              </div>
            </div>

            {/* Column: Entregados */}
            <div className={`flex-grow flex-shrink flex-1 flex flex-col gap-sm lg:max-w-xs ${activeMobileCol === 'Entregado' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-2 border-b border-[#2e7d32]/30">
                <h3 className="font-label-sm text-sm text-on-surface flex items-center gap-2 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2e7d32]"></span>
                  Entregados ({getOrdersByState('Entregado').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-md overflow-y-auto pr-1">
                {getOrdersByState('Entregado').length === 0 ? (
                  <div className="text-center py-lg text-on-surface-variant/40 text-xs italic">
                    Sin pedidos entregados
                  </div>
                ) : (
                  getOrdersByState('Entregado').map((o) => (
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
                        <span className="text-[10px] text-[#2e7d32] font-semibold bg-[#2e7d32]/10 px-2 py-0.5 rounded-full">
                          ENTREGADO
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
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Backdrop overlay for mobile drawer */}
        {selectedOrder && (
          <div
            onClick={() => setSelectedOrder(null)}
            className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-xs transition-opacity duration-300"
          />
        )}

        {/* Side Details Panel */}
        {selectedOrder && (
          <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] lg:relative lg:inset-auto lg:z-10 lg:w-[420px] border-l border-outline-variant/30 bg-surface-container-lowest flex flex-col h-full flex-shrink-0 shadow-2xl lg:shadow-none transition-all duration-300">
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

            {/* Side Drawer Actions Footer */}
            <div className="p-lg border-t border-outline-variant/30 bg-surface flex flex-col gap-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-sm">Total del Pedido:</span>
                <span className="font-headline-lg-mobile text-primary font-bold">
                  ${selectedOrder.total.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="flex gap-2">
                {/* Contact via WhatsApp */}
                <a
                  href={`https://wa.me/${selectedOrder.celular.replace(/\+/g, '')}?text=${encodeURIComponent(
                    `Hola ${selectedOrder.cliente}, me contacto del restaurante Super IN sobre tu pedido ${selectedOrder.codigo}...`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-grow bg-[#25D366] text-white text-xs font-bold py-3 rounded-full flex items-center justify-center gap-1 hover:bg-[#1EBE5C] transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">chat</span>
                  WhatsApp
                </a>

                {/* State Transition Button */}
                {selectedOrder.estado === 'Pendiente de confirmación' && (
                  <>
                    <button
                      onClick={() => {
                        setConfirmOrderTarget(selectedOrder);
                        setShowConfirmModal(true);
                      }}
                      className="flex-grow bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleRejectOrder(selectedOrder.codigo)}
                      className="bg-error-container text-error text-xs font-bold px-4 py-3 rounded-full hover:bg-error-container/80 cursor-pointer transition-all"
                      title="Rechazar Pedido"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {selectedOrder.estado === 'Confirmado' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.codigo, 'En preparación')}
                    className="flex-grow bg-secondary text-on-secondary text-xs font-bold py-3 rounded-full hover:opacity-90 cursor-pointer transition-all"
                  >
                    Enviar a Cocina
                  </button>
                )}

                {selectedOrder.estado === 'En preparación' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.codigo, 'En camino')}
                    className="flex-grow bg-primary-container text-on-primary-container text-xs font-bold py-3 rounded-full hover:opacity-90 cursor-pointer transition-all"
                  >
                    Despachar
                  </button>
                )}

                {selectedOrder.estado === 'En camino' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.codigo, 'Entregado')}
                    className="flex-grow bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                  >
                    Entregado
                  </button>
                )}
              </div>

              {selectedOrder.estado === 'Entregado' && (
                <div className="bg-success-container/20 text-[#2e7d32] p-md rounded-xl text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  Pedido Entregado con Éxito
                </div>
              )}
            </div>
          </aside>
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
