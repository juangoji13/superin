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
    if (state === 'En camino') {
      return filteredOrders.filter((o) => o.estado === 'Listo' || o.estado === 'En camino');
    }
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
    camino: orders.filter((o) => o.estado === 'En camino' || o.estado === 'Listo').length,
    ventasHoy: orders
      .filter((o) => o.estado === 'Entregado' && isToday(o.creado_a))
      .reduce((sum, o) => sum + o.total, 0),
    total: orders.filter((o) => o.estado !== 'Cancelado' && o.estado !== 'Expirado').length
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="min-h-[4rem] py-2 lg:py-0 lg:h-16 px-md flex flex-col lg:flex-row lg:items-center justify-between gap-sm border-b border-outline-variant/70 bg-surface/80 backdrop-blur-md z-10 flex-shrink-0">
        <div>
          <h2 className="text-sm lg:text-base text-on-surface font-extrabold tracking-tight">Resumen de Pedidos</h2>
          <p className="text-[10px] text-on-surface-variant font-medium">Operación en tiempo real</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          {/* Emergency Stop Button */}
          <button
            onClick={handleToggleLocalStatus}
            disabled={loadingLocalStatus}
            className={`px-3 py-1.5 rounded-full font-extrabold text-[10px] flex items-center gap-1 shadow-sm transition-all border cursor-pointer ${
              localAbierto
                ? 'bg-success-container/20 border-success/30 text-[#2e7d32] hover:bg-success-container/40'
                : 'bg-error-container/20 border-error/30 text-error hover:bg-error-container/40 animate-pulse'
            }`}
            title={localAbierto ? 'Haga clic para cerrar el recibo de pedidos' : 'Haga clic para abrir el recibo de pedidos'}
          >
            <span className={`w-2 h-2 rounded-full ${localAbierto ? 'bg-[#2e7d32]' : 'bg-error'}`}></span>
            {localAbierto ? 'Local Abierto' : 'Local Cerrado'}
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-full font-extrabold text-[10px] flex items-center gap-1 bg-surface-container-lowest border border-outline text-on-surface hover:bg-surface-container-low transition-all cursor-pointer shadow-sm"
            title="Exportar ventas a archivo CSV"
          >
            <span className="material-symbols-outlined text-[14px]">download</span>
            Exportar Reporte
          </button>

          {/* Toggle Stats Button */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-3 py-1.5 rounded-full font-extrabold text-[10px] flex items-center gap-1 border transition-all cursor-pointer shadow-sm ${
              showStats
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-surface-container-lowest border border-outline text-on-surface hover:bg-surface-container-low'
            }`}
            title="Ver estadísticas de los últimos 7 días y platos estrella"
          >
            <span className="material-symbols-outlined text-[14px]">bar_chart</span>
            {showStats ? 'Ocultar Estadísticas' : 'Ver Estadísticas'}
          </button>

          {/* Search bar */}
          <div className="relative w-full lg:w-48">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-xs">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1 bg-surface-container-lowest border border-outline rounded-full text-xs focus:border-primary focus:outline-none placeholder:text-outline-variant"
            />
          </div>
        </div>
      </header>

      {/* Collapsible Stats Dashboard */}
      {showStats && (
        <div className="bg-surface-container-low/60 px-md py-4 border-b border-outline-variant/70 flex-shrink-0 transition-all duration-300 animate-[slideDown_0.3s_ease-out]">
          {/* Row 1: Sales Chart + Order Distribution Donut */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md mb-md">
            {/* Sales chart card - 2 cols */}
            <div className="lg:col-span-2 bg-surface p-4 rounded-xl border border-outline-variant/70 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-sm">trending_up</span>
                  Ventas Últimos 7 Días
                </h3>
                <span className="text-[9px] font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
                  ${getLast7DaysSales().reduce((s, d) => s + d.total, 0).toLocaleString('es-CO')} acumulado
                </span>
              </div>
              
              <div className="flex-1 min-h-[110px] flex items-end gap-2 pt-2 px-1 border-b border-outline-variant/40 pb-1">
                {getLast7DaysSales().map((day, i) => {
                  const maxVal = Math.max(...getLast7DaysSales().map(d => d.total), 1);
                  const percent = (day.total / maxVal) * 100;
                  const isToday2 = i === 6;
                  
                  return (
                    <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute bottom-full mb-1.5 bg-on-surface text-surface text-[9px] font-bold px-2 py-0.5 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        ${day.total.toLocaleString('es-CO')}
                      </div>
                      <div className="w-full bg-surface-container-high rounded-t-md overflow-hidden flex items-end min-h-[5px] h-[90px]">
                        <div 
                          style={{ height: `${percent}%`, animationDelay: `${i * 80}ms` }}
                          className={`w-full rounded-t-md transition-all duration-700 animate-[growUp_0.6s_ease-out_both] ${
                            isToday2 
                              ? 'bg-gradient-to-t from-primary to-primary/60 shadow-sm' 
                              : day.total > 0 
                                ? 'bg-gradient-to-t from-primary/70 to-primary/30 hover:from-primary hover:to-primary/50' 
                                : 'bg-outline-variant/20'
                          }`}
                        />
                      </div>
                      <span className={`text-[9px] font-bold capitalize select-none text-center ${
                        isToday2 ? 'text-primary' : 'text-on-surface-variant'
                      }`}>
                        {isToday2 ? 'Hoy' : day.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Distribution Donut Chart */}
            <div className="bg-surface p-4 rounded-xl border border-outline-variant/70 shadow-sm flex flex-col items-center justify-center">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3 flex items-center gap-1 self-start">
                <span className="material-symbols-outlined text-primary text-sm">pie_chart</span>
                Distribución de Pedidos
              </h3>
              {(() => {
                const stateColors = [
                  { label: 'Pendientes', count: kpis.pendientes, color: '#d32f2f' },
                  { label: 'En Cocina', count: kpis.preparacion, color: '#7c4dff' },
                  { label: 'En Reparto', count: kpis.camino, color: '#1565c0' },
                  { label: 'Entregados', count: orders.filter(o => o.estado === 'Entregado').length, color: '#2e7d32' },
                ];
                const totalDonut = stateColors.reduce((s, c) => s + c.count, 0) || 1;
                let cumOffset = 0;

                return (
                  <div className="flex items-center gap-3 w-full">
                    <svg viewBox="0 0 36 36" className="w-20 h-20 flex-shrink-0">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e0e0e0" strokeWidth="3.5" />
                      {stateColors.map((seg) => {
                        const pct = (seg.count / totalDonut) * 100;
                        const dashArray = `${pct} ${100 - pct}`;
                        const offset = 25 - cumOffset;
                        cumOffset += pct;
                        return (
                          <circle
                            key={seg.label}
                            cx="18" cy="18" r="15.915"
                            fill="none"
                            stroke={seg.color}
                            strokeWidth="3.5"
                            strokeDasharray={dashArray}
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            className="transition-all duration-700"
                          />
                        );
                      })}
                      <text x="18" y="18" textAnchor="middle" dominantBaseline="central" className="fill-on-surface" fontSize="6" fontWeight="800">
                        {totalDonut === 1 && kpis.total === 0 ? '0' : kpis.total}
                      </text>
                    </svg>
                    <div className="flex flex-col gap-1.5 flex-1">
                      {stateColors.map((seg) => (
                        <div key={seg.label} className="flex items-center justify-between text-[9px]">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }} />
                            <span className="text-on-surface-variant font-semibold">{seg.label}</span>
                          </div>
                          <span className="font-bold text-on-surface font-mono">{seg.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Row 2: Top Products + Extra Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
            {/* Top Products card */}
            <div className="bg-surface p-4 rounded-xl border border-outline-variant/70 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-primary text-sm">workspace_premium</span>
                  Platos Estrella (Top 3)
                </h3>
                <div className="flex flex-col gap-2">
                  {topDishes.length === 0 ? (
                    <p className="text-[10px] text-on-surface-variant italic py-2">No hay datos registrados aún.</p>
                  ) : (
                    topDishes.map((dish, index) => {
                      const medals = ['🥇', '🥈', '🥉'];
                      const barColors = ['bg-yellow-400', 'bg-slate-300', 'bg-amber-500'];
                      const maxDish = topDishes[0]?.cantidad || 1;
                      return (
                        <div key={dish.nombre} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low border border-outline-variant/40">
                          <span className="text-base">{medals[index]}</span>
                          <div className="flex-1">
                            <span className="text-[10px] font-bold text-on-background block leading-tight">{dish.nombre}</span>
                            <div className="w-full bg-surface-container-high rounded-full h-1.5 mt-1">
                              <div className={`h-full rounded-full ${barColors[index]} transition-all duration-700`} style={{ width: `${(dish.cantidad / maxDish) * 100}%` }} />
                            </div>
                          </div>
                          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[9px] font-bold">{dish.cantidad}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Avg Ticket + Completion Rate */}
            <div className="bg-surface p-4 rounded-xl border border-outline-variant/70 shadow-sm flex flex-col gap-3">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-sm">analytics</span>
                Métricas Clave
              </h3>
              {(() => {
                const entregados = orders.filter(o => o.estado === 'Entregado');
                const todayEntregados = entregados.filter(o => isToday(o.creado_a));
                const avgTicket = todayEntregados.length > 0 
                  ? Math.round(todayEntregados.reduce((s, o) => s + o.total, 0) / todayEntregados.length) 
                  : 0;
                const completionRate = orders.length > 0 
                  ? Math.round((entregados.length / orders.filter(o => o.estado !== 'Cancelado' && o.estado !== 'Expirado').length) * 100) || 0
                  : 0;
                return (
                  <>
                    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/40">
                      <div>
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase block">Ticket Promedio Hoy</span>
                        <span className="text-lg font-extrabold text-on-background font-mono">${avgTicket.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <span className="material-symbols-outlined">receipt</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/40">
                      <div>
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase block">Tasa de Completado</span>
                        <span className="text-lg font-extrabold text-on-background font-mono">{completionRate}%</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-[#2e7d32]/10 text-[#2e7d32] flex items-center justify-center">
                        <span className="material-symbols-outlined">check_circle</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg border border-outline-variant/40">
                      <div>
                        <span className="text-[9px] text-on-surface-variant font-bold uppercase block">Entregados Hoy</span>
                        <span className="text-lg font-extrabold text-on-background font-mono">{todayEntregados.length}</span>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                        <span className="material-symbols-outlined">local_shipping</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Hourly Heatmap */}
            <div className="bg-surface p-4 rounded-xl border border-outline-variant/70 shadow-sm flex flex-col">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                Franjas Más Populares
              </h3>
              {(() => {
                const franjaMap: Record<string, number> = {};
                orders.filter(o => o.estado === 'Entregado').forEach(o => {
                  franjaMap[o.franja] = (franjaMap[o.franja] || 0) + 1;
                });
                const sorted = Object.entries(franjaMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
                const maxFranja = sorted[0]?.[1] || 1;
                return sorted.length === 0 ? (
                  <p className="text-[10px] text-on-surface-variant italic py-2">Sin datos de entregas aún.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {sorted.map(([franja, count]) => (
                      <div key={franja} className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-on-surface-variant w-14 text-right font-semibold">{franja}</span>
                        <div className="flex-1 bg-surface-container-high rounded-full h-2.5">
                          <div 
                            className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700" 
                            style={{ width: `${(count / maxFranja) * 100}%` }} 
                          />
                        </div>
                        <span className="text-[9px] font-bold text-on-surface font-mono w-6">{count}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
              <p className="text-[8px] text-on-surface-variant/70 italic mt-auto pt-2 border-t border-outline-variant/40">
                Basado en entregas completadas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPIs Summary Bar */}
      <section className="bg-surface-container-low/40 px-md py-2 border-b border-outline-variant/70 flex gap-2 overflow-x-auto flex-shrink-0">
        {/* Card: Recaudado Hoy */}
        <div className="flex-1 min-w-[140px] bg-surface p-2.5 rounded-xl border border-outline-variant/70 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-success-container/30 text-success flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-lg font-bold">payments</span>
          </div>
          <div>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider block">Recaudado</span>
            <span key={kpis.ventasHoy} className="text-sm font-extrabold text-on-background font-mono animate-count-up" style={{animationFillMode: 'both', display: 'inline-block'}}>${kpis.ventasHoy.toLocaleString('es-CO')}</span>
          </div>
        </div>

        {/* Card: Pedidos Pendientes */}
        <div className="flex-1 min-w-[120px] bg-surface p-2.5 rounded-xl border border-outline-variant/70 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-error-container/30 text-error flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-lg font-bold">pending_actions</span>
          </div>
          <div>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider block">Pendientes</span>
            <span key={kpis.pendientes} className="text-sm font-extrabold text-on-background font-mono animate-count-up" style={{animationFillMode: 'both', display: 'inline-block'}}>{kpis.pendientes}</span>
          </div>
        </div>

        {/* Card: En Cocina */}
        <div className="flex-1 min-w-[120px] bg-surface p-2.5 rounded-xl border border-outline-variant/70 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-container/30 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-lg font-bold">skillet</span>
          </div>
          <div>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider block">En Cocina</span>
            <span key={kpis.preparacion} className="text-sm font-extrabold text-on-background font-mono animate-count-up" style={{animationFillMode: 'both', display: 'inline-block'}}>{kpis.preparacion}</span>
          </div>
        </div>

        {/* Card: En Camino */}
        <div className="flex-1 min-w-[120px] bg-surface p-2.5 rounded-xl border border-outline-variant/70 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-secondary-container/30 text-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-lg font-bold">two_wheeler</span>
          </div>
          <div>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider block">En Camino</span>
            <span key={kpis.camino} className="text-sm font-extrabold text-on-background font-mono animate-count-up" style={{animationFillMode: 'both', display: 'inline-block'}}>{kpis.camino}</span>
          </div>
        </div>

        {/* Card: Total Pedidos */}
        <div className="flex-1 min-w-[120px] bg-surface p-2.5 rounded-xl border border-outline-variant/70 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-surface-container-high/60 text-on-surface flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-lg font-bold">receipt_long</span>
          </div>
          <div>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider block">Total</span>
            <span key={kpis.total} className="text-sm font-extrabold text-on-background font-mono animate-count-up" style={{animationFillMode: 'both', display: 'inline-block'}}>{kpis.total}</span>
          </div>
        </div>
      </section>

      {/* Mobile Column Tabs Switcher */}
      <div className="lg:hidden flex bg-surface-container px-md border-b border-outline-variant/70 flex-shrink-0 overflow-x-auto gap-1">
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
            className={`py-2 px-2 text-[11px] font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              activeMobileCol === tab.state ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${tab.color}`}></span>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Workspace Area split into columns + Details Side Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Kanban Board */}
        <div className="flex-1 overflow-x-auto p-md bg-surface-container-low/20">
          <div className="w-full h-full flex flex-col lg:grid lg:grid-cols-5 gap-3 justify-start lg:min-w-0">
            {/* Column: Pendientes */}
            <div className={`flex-1 min-w-[160px] flex flex-col gap-xs ${activeMobileCol === 'Pendiente de confirmación' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-error/30">
                <h3 className="text-xs text-on-surface flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                  Pendientes ({getOrdersByState('Pendiente de confirmación').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-sm overflow-y-auto pr-0.5 pt-1">
                {getOrdersByState('Pendiente de confirmación').length === 0 ? (
                  <div className="text-center py-md text-on-surface-variant/40 text-[11px] italic">
                    Sin pedidos pendientes
                  </div>
                ) : (
                  getOrdersByState('Pendiente de confirmación').map((o) => (
                    <div
                      key={o.codigo}
                      onClick={() => setSelectedOrder(o)}
                      className={`bg-surface-container-lowest p-2.5 rounded-lg border transition-all cursor-pointer shadow-xs ${
                        selectedOrder?.codigo === o.codigo
                          ? 'border-primary ring-1.5 ring-primary-container/20'
                          : 'border-outline-variant/70 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-primary font-mono text-[11px]">{o.codigo}</span>
                        <span className="text-[8px] text-error font-bold bg-error-container/20 px-1.5 py-0.25 rounded-full">
                          NUEVO
                        </span>
                      </div>
                      <h4 className="font-bold text-on-background text-[11px] mb-0.5 truncate">{o.cliente}</h4>
                      <p className="text-[10px] text-on-surface-variant mb-1.5 truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">location_on</span>
                        {o.direccion} ({o.barrio})
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-semibold pt-1.5 border-t border-outline-variant/40">
                        <span className="bg-surface-variant px-2 py-0.25 rounded-full text-[9px]">
                          {o.franja}
                        </span>
                        <span className="text-primary font-bold text-[10px]">${o.total.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmOrderTarget(o);
                            setShowConfirmModal(true);
                          }}
                          className="flex-1 bg-primary text-on-primary text-[10px] font-bold py-1 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRejectOrder(o.codigo);
                          }}
                          className="border border-error text-error text-[10px] font-bold px-2 py-1 rounded-full hover:bg-error-container/10 cursor-pointer transition-all"
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
            <div className={`flex-1 min-w-[160px] flex flex-col gap-xs ${activeMobileCol === 'Confirmado' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-secondary/30">
                <h3 className="text-xs text-on-surface flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  Confirmados ({getOrdersByState('Confirmado').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-sm overflow-y-auto pr-0.5 pt-1">
                {getOrdersByState('Confirmado').length === 0 ? (
                  <div className="text-center py-md text-on-surface-variant/40 text-[11px] italic">
                    Sin pedidos confirmados
                  </div>
                ) : (
                  getOrdersByState('Confirmado').map((o) => (
                    <div
                      key={o.codigo}
                      onClick={() => setSelectedOrder(o)}
                      className={`bg-surface-container-lowest p-2.5 rounded-lg border transition-all cursor-pointer shadow-xs ${
                        selectedOrder?.codigo === o.codigo
                          ? 'border-primary ring-1.5 ring-primary-container/20'
                          : 'border-outline-variant/70 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-primary font-mono text-[11px]">{o.codigo}</span>
                        {o.tiempo_estimado && (
                          <span className="text-[8px] text-primary font-bold bg-primary-container/10 px-1.5 py-0.25 rounded-full">
                            {o.tiempo_estimado} min
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-on-background text-[11px] mb-0.5 truncate">{o.cliente}</h4>
                      <p className="text-[10px] text-on-surface-variant mb-1.5 truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">location_on</span>
                        {o.direccion} ({o.barrio})
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-semibold pt-1.5 border-t border-outline-variant/40">
                        <span className="bg-surface-variant px-2 py-0.25 rounded-full text-[9px]">
                          {o.franja}
                        </span>
                        <span className="text-primary font-bold text-[10px]">${o.total.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(o.codigo, 'En preparación');
                          }}
                          className="w-full bg-secondary text-on-secondary text-[10px] font-bold py-1 rounded-full hover:opacity-90 cursor-pointer transition-all"
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
            <div className={`flex-1 min-w-[160px] flex flex-col gap-xs ${activeMobileCol === 'En preparación' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-primary-container/30">
                <h3 className="text-xs text-on-surface flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                  En Cocina ({getOrdersByState('En preparación').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-sm overflow-y-auto pr-0.5 pt-1">
                {getOrdersByState('En preparación').length === 0 ? (
                  <div className="text-center py-md text-on-surface-variant/40 text-[11px] italic">
                    Sin pedidos en cocina
                  </div>
                ) : (
                  getOrdersByState('En preparación').map((o) => (
                    <div
                      key={o.codigo}
                      onClick={() => setSelectedOrder(o)}
                      className={`bg-surface-container-lowest p-2.5 rounded-lg border transition-all cursor-pointer shadow-xs ${
                        selectedOrder?.codigo === o.codigo
                          ? 'border-primary ring-1.5 ring-primary-container/20'
                          : 'border-outline-variant/70 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-primary font-mono text-[11px]">{o.codigo}</span>
                      </div>
                      <h4 className="font-bold text-on-background text-[11px] mb-0.5 truncate">{o.cliente}</h4>
                      <p className="text-[10px] text-on-surface-variant mb-1.5 truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">location_on</span>
                        {o.direccion} ({o.barrio})
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-semibold pt-1.5 border-t border-outline-variant/40">
                        <span className="bg-surface-variant px-2 py-0.25 rounded-full text-[9px]">
                          {o.franja}
                        </span>
                        <span className="text-primary font-bold text-[10px]">${o.total.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(o.codigo, 'Listo');
                          }}
                          className="w-full bg-primary-container text-on-primary-container text-[10px] font-bold py-1 rounded-full hover:opacity-90 cursor-pointer transition-all"
                        >
                          Marcar Listo
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column: En Reparto */}
            <div className={`flex-1 min-w-[160px] flex flex-col gap-xs ${activeMobileCol === 'En camino' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-primary/30">
                <h3 className="text-xs text-on-surface flex items-center gap-1.5 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  En Reparto ({getOrdersByState('En camino').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-sm overflow-y-auto pr-0.5 pt-1">
                {getOrdersByState('En camino').length === 0 ? (
                  <div className="text-center py-md text-on-surface-variant/40 text-[11px] italic">
                    Sin pedidos en reparto
                  </div>
                ) : (
                  getOrdersByState('En camino').map((o) => (
                    <div
                      key={o.codigo}
                      onClick={() => setSelectedOrder(o)}
                      className={`bg-surface-container-lowest p-2.5 rounded-lg border transition-all cursor-pointer shadow-xs ${
                        selectedOrder?.codigo === o.codigo
                          ? 'border-primary ring-1.5 ring-primary-container/20'
                          : 'border-outline-variant/70 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-primary font-mono text-[11px]">{o.codigo}</span>
                        {o.estado === 'Listo' ? (
                          <span className="bg-secondary-container text-on-secondary-container text-[8px] font-bold px-1.5 py-0.25 rounded-full">
                            Listo
                          </span>
                        ) : (
                          <span className="bg-primary-container text-on-primary-container text-[8px] font-bold px-1.5 py-0.25 rounded-full">
                            En Reparto
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-on-background text-[11px] mb-0.5 truncate">{o.cliente}</h4>
                      <p className="text-[10px] text-on-surface-variant mb-1.5 truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">location_on</span>
                        {o.direccion} ({o.barrio})
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-semibold pt-1.5 border-t border-outline-variant/40">
                        <span className="bg-surface-variant px-2 py-0.25 rounded-full text-[9px]">
                          {o.franja}
                        </span>
                        <span className="text-primary font-bold text-[10px]">${o.total.toLocaleString('es-CO')}</span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {o.estado === 'Listo' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(o.codigo, 'En camino');
                            }}
                            className="w-full bg-primary text-on-primary text-[10px] font-bold py-1 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                          >
                            Iniciar Reparto
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(o.codigo, 'Entregado');
                            }}
                            className="w-full bg-[#2e7d32] text-white text-[10px] font-bold py-1 rounded-full hover:opacity-90 cursor-pointer transition-all"
                          >
                            Marcar Entregado
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column: Entregados */}
            <div className={`flex-1 min-w-[160px] flex flex-col gap-xs ${activeMobileCol === 'Entregado' ? 'flex' : 'hidden lg:flex'}`}>
              <div className="flex items-center justify-between pb-1.5 border-b border-[#2e7d32]/30">
                <h3 className="text-xs text-on-surface flex items-center gap-1.5 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#2e7d32]"></span>
                  Entregados ({getOrdersByState('Entregado').length})
                </h3>
              </div>
              <div className="flex-grow flex flex-col gap-sm overflow-y-auto pr-0.5 pt-1">
                {getOrdersByState('Entregado').length === 0 ? (
                  <div className="text-center py-md text-on-surface-variant/40 text-[11px] italic">
                    Sin pedidos entregados
                  </div>
                ) : (
                  getOrdersByState('Entregado').map((o) => (
                    <div
                      key={o.codigo}
                      onClick={() => setSelectedOrder(o)}
                      className={`bg-surface-container-lowest p-2.5 rounded-lg border transition-all cursor-pointer shadow-xs ${
                        selectedOrder?.codigo === o.codigo
                          ? 'border-primary ring-1.5 ring-primary-container/20'
                          : 'border-outline-variant/70 hover:shadow-xs'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-bold text-primary font-mono text-[11px]">{o.codigo}</span>
                        <span className="text-[8px] text-[#2e7d32] font-bold bg-[#2e7d32]/10 px-1.5 py-0.25 rounded-full">
                          ENTREGADO
                        </span>
                      </div>
                      <h4 className="font-bold text-on-background text-[11px] mb-0.5 truncate">{o.cliente}</h4>
                      <p className="text-[10px] text-on-surface-variant mb-1.5 truncate flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[10px]">location_on</span>
                        {o.direccion} ({o.barrio})
                      </p>
                      <div className="flex justify-between items-center text-[10px] font-semibold pt-1.5 border-t border-outline-variant/40">
                        <span className="bg-surface-variant px-2 py-0.25 rounded-full text-[9px]">
                          {o.franja}
                        </span>
                        <span className="text-primary font-bold text-[10px]">${o.total.toLocaleString('es-CO')}</span>
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
          <aside className="fixed inset-y-0 right-0 z-40 w-full sm:w-[350px] lg:relative lg:inset-auto lg:z-10 lg:w-[350px] border-l border-outline-variant/70 bg-surface-container-lowest flex flex-col h-full flex-shrink-0 shadow-2xl lg:shadow-none transition-all duration-300">
            <div className="p-md border-b border-outline-variant/70 flex justify-between items-center">
              <div>
                <h3 className="text-xs text-primary font-bold font-mono">{selectedOrder.codigo}</h3>
                <p className="text-[10px] text-on-surface-variant">Creado: {new Date(selectedOrder.creado_a).toLocaleTimeString('es-CO')}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-full hover:bg-surface-container-high"
              >
                <span className="material-symbols-outlined text-on-surface text-sm">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-md flex flex-col gap-sm">
              {/* Cliente */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Datos del Cliente
                </h4>
                <div className="bg-surface-container-low p-sm rounded-lg text-[11px] flex flex-col gap-1.5">
                  <p><strong>Nombre:</strong> {selectedOrder.cliente}</p>
                  <p><strong>Celular:</strong> {selectedOrder.celular}</p>
                  <p><strong>Dirección:</strong> {selectedOrder.direccion} ({selectedOrder.barrio})</p>
                  {selectedOrder.referencia && <p><strong>Indicaciones:</strong> {selectedOrder.referencia}</p>}
                </div>
              </div>

              {/* Entrega y Pago */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Entrega y Pago
                </h4>
                <div className="bg-surface-container-low p-sm rounded-lg text-[11px] flex flex-col gap-1.5">
                  <p><strong>Franja:</strong> {selectedOrder.franja}</p>
                  <p><strong>Pago:</strong> {selectedOrder.metodo_pago}</p>
                  <p><strong>Estado:</strong> <span className="font-bold text-primary">{selectedOrder.estado}</span></p>
                </div>
              </div>

              {/* Comprobante de Pago */}
              {selectedOrder.metodo_pago === 'Transferencia' && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                    Comprobante
                  </h4>
                  {selectedComprobante ? (
                    <div className="border border-outline-variant/70 rounded-lg overflow-hidden mt-1">
                      <a href={selectedComprobante.url_archivo} target="_blank" rel="noopener noreferrer">
                        <img
                          src={selectedComprobante.url_archivo}
                          alt="Comprobante Nequi/Bancolombia"
                          className="w-full h-32 object-contain bg-black/5 hover:opacity-90 cursor-pointer"
                        />
                      </a>
                      <p className="text-[9px] text-center text-on-surface-variant py-0.5 bg-surface-container-low">
                        Click para ver completo
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-error italic">Aún no se ha cargado el comprobante.</p>
                  )}
                </div>
              )}

              {/* Productos */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                  Productos
                </h4>
                <div className="flex flex-col gap-1.5">
                  {loadingDetails ? (
                    <div className="text-center py-xs">
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-primary mx-auto"></div>
                    </div>
                  ) : (
                    selectedDetails.map((item) => (
                      <div key={item.id} className="bg-surface-container-low p-2 rounded-lg flex flex-col text-[11px]">
                        <div className="flex justify-between font-bold">
                          <span>
                            {item.nombre} <span className="text-primary font-normal">x{item.cantidad}</span>
                          </span>
                          <span>${(item.precio * item.cantidad).toLocaleString('es-CO')}</span>
                        </div>
                        {item.componentes && (
                          <div className="mt-0.5 text-[10px] text-on-surface-variant">
                            {Object.entries(item.componentes)
                              .map(([_, comp]: any) => comp?.nombre)
                              .filter(Boolean)
                              .join(', ')}
                          </div>
                        )}
                        {item.observaciones && (
                          <p className="mt-0.5 text-[10px] text-error italic">Obs: {item.observaciones}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Side Drawer Actions Footer */}
            <div className="p-md border-t border-outline-variant/70 bg-surface flex flex-col gap-1.5">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-xs">Total del Pedido:</span>
                <span className="text-sm text-primary font-bold">
                  ${selectedOrder.total.toLocaleString('es-CO')}
                </span>
              </div>

              <div className="flex gap-1">
                {/* Contact via WhatsApp with Dynamic Templates */}
                {(() => {
                  const waTemplates: Record<string, string> = {
                    'Pendiente de confirmación': `Hola ${selectedOrder.cliente} 👋, te contactamos de *Super IN* para confirmar tu pedido *${selectedOrder.codigo}*. En breve validamos disponibilidad. ¡Gracias por tu preferencia! 🍽️`,
                    'Confirmado': `¡Hola ${selectedOrder.cliente}! ✅ Tu pedido *${selectedOrder.codigo}* ha sido confirmado y está entrando a la cocina. Tiempo estimado: *${selectedOrder.tiempo_estimado || 45} min*. Te avisaremos cuando salga. 🔥`,
                    'En preparación': `Hola ${selectedOrder.cliente} 👨‍🍳, tu pedido *${selectedOrder.codigo}* está siendo preparado con cariño. Pronto saldrá de nuestra cocina. ¡Paciencia, ya casi! 🍲`,
                    'Listo': `¡${selectedOrder.cliente}! 🎉 Tu pedido *${selectedOrder.codigo}* ya está listo y va a ser despachado. El repartidor saldrá en breve con tu almuerzo. 🛵`,
                    'En camino': `¡${selectedOrder.cliente}, tu pedido *${selectedOrder.codigo}* va en camino! 🛵💨 El repartidor se dirige a ${selectedOrder.direccion}. Puedes seguir tu pedido aquí: ${typeof window !== 'undefined' ? window.location.origin : ''}/pedido/${selectedOrder.codigo}`,
                    'Entregado': `¡Hola ${selectedOrder.cliente}! ✅ Tu pedido *${selectedOrder.codigo}* fue entregado exitosamente. ¡Esperamos que disfrutes tu almuerzo! Gracias por elegir *Super IN* 🤩💛`
                  };
                  const msg = waTemplates[selectedOrder.estado] || `Hola ${selectedOrder.cliente}, me contacto de Super IN sobre tu pedido ${selectedOrder.codigo}.`;
                  return (
                    <a
                      href={`https://wa.me/${selectedOrder.celular.replace(/\+/g, '')}?text=${encodeURIComponent(msg)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow bg-[#25D366] text-white text-[10px] font-bold py-2 rounded-full flex items-center justify-center gap-1 hover:bg-[#1EBE5C] transition-all"
                    >
                      <span className="material-symbols-outlined text-[14px]">chat</span>
                      WhatsApp
                    </a>
                  );
                })()}

                {/* State Transition Button */}
                {selectedOrder.estado === 'Pendiente de confirmación' && (
                  <>
                    <button
                      onClick={() => {
                        setConfirmOrderTarget(selectedOrder);
                        setShowConfirmModal(true);
                      }}
                      className="flex-grow bg-primary text-on-primary text-[10px] font-bold py-2 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => handleRejectOrder(selectedOrder.codigo)}
                      className="bg-error-container text-error text-[10px] font-bold px-3 py-2 rounded-full hover:bg-error-container/80 cursor-pointer transition-all"
                      title="Rechazar Pedido"
                    >
                      Rechazar
                    </button>
                  </>
                )}

                {selectedOrder.estado === 'Confirmado' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.codigo, 'En preparación')}
                    className="flex-grow bg-secondary text-on-secondary text-[10px] font-bold py-2 rounded-full hover:opacity-90 cursor-pointer transition-all"
                  >
                    Enviar a Cocina
                  </button>
                )}

                {selectedOrder.estado === 'En preparación' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.codigo, 'Listo')}
                    className="flex-grow bg-primary-container text-on-primary-container text-[10px] font-bold py-2 rounded-full hover:opacity-90 cursor-pointer transition-all"
                  >
                    Marcar Listo
                  </button>
                )}

                {selectedOrder.estado === 'Listo' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.codigo, 'En camino')}
                    className="flex-grow bg-primary text-on-primary text-[10px] font-bold py-2 rounded-full hover:bg-primary-container cursor-pointer transition-all"
                  >
                    Despachar (En Camino)
                  </button>
                )}

                {selectedOrder.estado === 'En camino' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedOrder.codigo, 'Entregado')}
                    className="flex-grow bg-[#2e7d32] text-white text-[10px] font-bold py-2 rounded-full hover:opacity-90 cursor-pointer transition-all"
                  >
                    Entregado
                  </button>
                )}
              </div>

              {selectedOrder.estado === 'Entregado' && (
                <div className="bg-success-container/20 text-[#2e7d32] p-2 rounded-lg text-center text-[10px] font-bold flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
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
