'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart, PreparedProduct, CustomDishComponents } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';

// Local Fallback Data
const MOCK_PREPARED_DISHES = [
  {
    id: 'costeno',
    nombre: 'Almuerzo costeño',
    descripcion: 'Arroz con coco, patacón, ensalada fresca y jugo de corozo.',
    precio: 22000,
    stock: 20,
    foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACbxDzIS5TpzpHjUnqgnSh-l5bPnVhVjrv0d9iZR2XxFzv2KcJIaWY1gLoikX1pbx26N8zQLQkVBmpNqZXN0FzUWruU9m1vv8V-At-XSKzmOUNTS5XkLCkdG89ar_oU4Z1YBQwt4lVUH-pntrFMaRv3MYqqIwewMfnCgaEV4nsbDk-Ehr5ypYFdWfm8jcZqLGZ9BxxKK01C7LclYFeK_0KkJb5qV9zP3KKX5_5AVlZN3C04YM3NNhizm24bPy7NxCRi-ULPhgIISE',
    activo: true
  },
  {
    id: 'carne_asada',
    nombre: 'Carne asada ejecutiva',
    descripcion: 'Corte premium a la parrilla con arroz blanco, papa criolla, ensalada y bebida.',
    precio: 25000,
    stock: 8,
    foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnsQzmXGl4zHzc4fGTRZuuBVjyJLHxA87DkSYsuybNNs0R3O0_Iq2jiBaKRvQyGkHb45fseTjj2hvAvsUs6lXo7YrTM0n3Po3Ph5DDVACnHOeJndR_pJuSrDJz5KXNKAbcNO-B_d9gMql5o7rY0M44CqkBJJBnQs_U9MGOkkaD015yAsQTYbVEU6p-jdH-z6wf2bx8_i5viP61FooGQmdv4agCGo7p1sX5oLmiorHTS8gfope_XM2IHgLxkGKGl1zrFM4KFvWGYHM',
    activo: true
  },
  {
    id: 'pescado_frito',
    nombre: 'Pescado frito',
    descripcion: 'Pescado fresco del día frito, con arroz con coco, patacones, ensalada y jugo.',
    precio: 28000,
    stock: 0,
    foto: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCZOWmCxpcuVpskeW5ok58mqvu7XCeOGP107SLllOIejlPkxpV9-h6vbNox5QB8UE2YFIq3AgdG8tB7ZoO1nM4VzvO8lnFU-mbk_L3YXYRtQxAd1BK1RQV_g0NjJVQU20JKdyJnozZIpNsY6KB1psh4WyscI8F_yVbPn0okcsE88qRoOQR_08MM5490S5TFUpthmMNMtdTpUt0wTlH6xls9zuMW_7q19SckM7fXsYACbSyocMGrkzZMOnz7z_Xr3470D9b5GBsHRyk',
    activo: true
  }
];

const MOCK_CUSTOM_OPTIONS = [
  // Arroz
  { id: 'a1', grupo: 'Arroz', nombre: 'Blanco', precio_adicional: 0, stock: 50, activo: true },
  { id: 'a2', grupo: 'Arroz', nombre: 'Con coco', precio_adicional: 1000, stock: 30, activo: true },
  { id: 'a3', grupo: 'Arroz', nombre: 'Mixto', precio_adicional: 1500, stock: 15, activo: true },
  // Proteína
  { id: 'p1', grupo: 'Proteína', nombre: 'Pollo guisado', precio_adicional: 3000, stock: 20, activo: true },
  { id: 'p2', grupo: 'Proteína', nombre: 'Carne asada', precio_adicional: 5000, stock: 10, activo: true },
  { id: 'p3', grupo: 'Proteína', nombre: 'Cerdo frito', precio_adicional: 4000, stock: 15, activo: true },
  { id: 'p4', grupo: 'Proteína', nombre: 'Pescado frito', precio_adicional: 7000, stock: 0, activo: true },
  // Acompañamiento
  { id: 'c1', grupo: 'Acompañamiento', nombre: 'Patacón', precio_adicional: 0, stock: 40, activo: true },
  { id: 'c2', grupo: 'Acompañamiento', nombre: 'Yuca cocida', precio_adicional: 0, stock: 40, activo: true },
  { id: 'c3', grupo: 'Acompañamiento', nombre: 'Papa criolla', precio_adicional: 500, stock: 20, activo: true },
  // Bebida
  { id: 'b1', grupo: 'Bebida', nombre: 'Jugo de corozo', precio_adicional: 0, stock: 30, activo: true },
  { id: 'b2', grupo: 'Bebida', nombre: 'Limonada natural', precio_adicional: 0, stock: 30, activo: true },
  { id: 'b3', grupo: 'Bebida', nombre: 'Gaseosa', precio_adicional: 1500, stock: 50, activo: true },
  { id: 'b4', grupo: 'Bebida', nombre: 'Agua embotellada', precio_adicional: 0, stock: 50, activo: true },
  // Ensalada
  { id: 'e1', grupo: 'Ensalada', nombre: 'Ensalada verde', precio_adicional: 0, stock: 45, activo: true },
  { id: 'e2', grupo: 'Ensalada', nombre: 'Ensalada rusa', precio_adicional: 500, stock: 15, activo: true },
  { id: 'e3', grupo: 'Ensalada', nombre: 'Sin ensalada', precio_adicional: 0, stock: 999, activo: true },
  // Sopa
  { id: 's1', grupo: 'Sopa', nombre: 'Sancocho ejecutivo', precio_adicional: 1500, stock: 10, activo: true },
  { id: 's2', grupo: 'Sopa', nombre: 'Crema de verduras', precio_adicional: 1000, stock: 15, activo: true },
  { id: 's3', grupo: 'Sopa', nombre: 'Sin sopa', precio_adicional: 0, stock: 999, activo: true },
  // Postre
  { id: 'd1', grupo: 'Postre', nombre: 'Flan de caramelo', precio_adicional: 3000, stock: 10, activo: true },
  { id: 'd2', grupo: 'Postre', nombre: 'Arroz con leche', precio_adicional: 2500, stock: 12, activo: true },
  { id: 'd3', grupo: 'Postre', nombre: 'Sin postre', precio_adicional: 0, stock: 999, activo: true }
];

const BASE_CUSTOM_PLATE_PRICE = 15000;

export default function DomiciliosPage() {
  const { addToCart, cartTotal, cartCount } = useCart();
  const [activeTab, setActiveTab] = useState<'prepared' | 'custom'>('prepared');
  const [preparedDishes, setPreparedDishes] = useState<any[]>(MOCK_PREPARED_DISHES);
  const [customOptions, setCustomOptions] = useState<any[]>(MOCK_CUSTOM_OPTIONS);

  // Modal State for Prepared Dish
  const [selectedDish, setSelectedDish] = useState<any | null>(null);
  const [dishQuantity, setDishQuantity] = useState(1);
  const [dishNotes, setDishNotes] = useState('');

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Customizer Selections
  const [customSelections, setCustomSelections] = useState({
    Arroz: '',
    Proteína: '',
    Acompañamiento: '',
    Bebida: '',
    Ensalada: 'Sin ensalada',
    Sopa: 'Sin sopa',
    Postre: 'Sin postre'
  });
  const [customNotes, setCustomNotes] = useState('');

  // Fetch menu data from Supabase
  useEffect(() => {
    async function fetchMenu() {
      try {
        const { data: dishes, error: dishesError } = await supabase
          .from('productos')
          .select('*')
          .eq('activo', true);

        const { data: options, error: optionsError } = await supabase
          .from('opciones_plato')
          .select('*')
          .eq('activo', true);

        if (dishes && dishes.length > 0) {
          setPreparedDishes(dishes);
        }
        if (options && options.length > 0) {
          setCustomOptions(options);
        }
      } catch (err) {
        console.error('Error connecting to Supabase, using mock data.', err);
      }
    }
    fetchMenu();
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handleAddPrepared = (dish: any) => {
    setSelectedDish(dish);
    setDishQuantity(1);
    setDishNotes('');
  };

  const submitPreparedToCart = () => {
    if (!selectedDish) return;
    addToCart({
      productId: selectedDish.id,
      type: 'prepared',
      nombre: selectedDish.nombre,
      precio: selectedDish.precio,
      cantidad: dishQuantity,
      observaciones: dishNotes
    });
    showToast(`¡${selectedDish.nombre} añadido al carrito!`);
    setSelectedDish(null);
  };

  // Custom Plate Price calculation
  const getCustomTotalPrice = () => {
    let price = BASE_CUSTOM_PLATE_PRICE;
    Object.entries(customSelections).forEach(([group, name]) => {
      const option = customOptions.find(o => o.grupo === group && o.nombre === name);
      if (option) {
        price += option.precio_adicional || 0;
      }
    });
    return price;
  };

  const handleCustomSelectionChange = (group: string, name: string) => {
    setCustomSelections(prev => ({ ...prev, [group]: name }));
  };

  const submitCustomToCart = () => {
    // Validate required selections
    if (!customSelections.Arroz || !customSelections.Proteína || !customSelections.Acompañamiento || !customSelections.Bebida) {
      alert('Por favor selecciona los componentes obligatorios (Arroz, Proteína, Acompañamiento y Bebida).');
      return;
    }

    const arrozOpt = customOptions.find(o => o.grupo === 'Arroz' && o.nombre === customSelections.Arroz);
    const proteinaOpt = customOptions.find(o => o.grupo === 'Proteína' && o.nombre === customSelections.Proteína);
    const acomOpt = customOptions.find(o => o.grupo === 'Acompañamiento' && o.nombre === customSelections.Acompañamiento);
    const bebidaOpt = customOptions.find(o => o.grupo === 'Bebida' && o.nombre === customSelections.Bebida);
    const ensaladaOpt = customOptions.find(o => o.grupo === 'Ensalada' && o.nombre === customSelections.Ensalada);
    const sopaOpt = customOptions.find(o => o.grupo === 'Sopa' && o.nombre === customSelections.Sopa);
    const postreOpt = customOptions.find(o => o.grupo === 'Postre' && o.nombre === customSelections.Postre);

    const components: CustomDishComponents = {
      arroz: { nombre: customSelections.Arroz, precio_adicional: arrozOpt?.precio_adicional || 0 },
      proteina: { nombre: customSelections.Proteína, precio_adicional: proteinaOpt?.precio_adicional || 0 },
      acompanamiento: { nombre: customSelections.Acompañamiento, precio_adicional: acomOpt?.precio_adicional || 0 },
      bebida: { nombre: customSelections.Bebida, precio_adicional: bebidaOpt?.precio_adicional || 0 },
      ensalada: ensaladaOpt && ensaladaOpt.nombre !== 'Sin ensalada' ? { nombre: ensaladaOpt.nombre, precio_adicional: ensaladaOpt.precio_adicional || 0 } : null,
      sopa: sopaOpt && sopaOpt.nombre !== 'Sin sopa' ? { nombre: sopaOpt.nombre, precio_adicional: sopaOpt.precio_adicional || 0 } : null,
      postre: postreOpt && postreOpt.nombre !== 'Sin postre' ? { nombre: postreOpt.nombre, precio_adicional: postreOpt.precio_adicional || 0 } : null
    };

    addToCart({
      type: 'custom',
      nombre: 'Almuerzo Armado',
      precio: getCustomTotalPrice(),
      cantidad: 1,
      observaciones: customNotes,
      componentes: components
    });

    // Reset selections
    setCustomSelections({
      Arroz: '',
      Proteína: '',
      Acompañamiento: '',
      Bebida: '',
      Ensalada: 'Sin ensalada',
      Sopa: 'Sin sopa',
      Postre: 'Sin postre'
    });
    setCustomNotes('');
    showToast('¡Almuerzo personalizado agregado al carrito!');
  };

  const getOptionsByGroup = (group: string) => {
    return customOptions.filter(option => option.grupo === group);
  };

  return (
    <div className="px-container-margin md:px-xl md:mt-8 mt-6 max-w-7xl mx-auto w-full pb-24 flex flex-col gap-lg">
      
      {/* Immersive Hero Header */}
      <header className="relative bg-gradient-to-br from-primary-container to-primary text-on-primary rounded-3xl p-8 md:p-12 overflow-hidden shadow-soft-lift flex flex-col gap-md">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="max-w-2xl relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-secondary-container text-on-secondary-container font-label-sm text-xs rounded-full mb-4 font-bold shadow-sm">
            <span className="material-symbols-outlined text-sm">delivery_dining</span>
            Entrega rápida en Barranquilla y Soledad
          </span>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white font-extrabold tracking-tight mb-4 leading-tight">
            Domicilios de comida típica en Barranquilla
          </h1>
          <p className="font-body-lg text-base md:text-lg text-on-primary-container/85 mb-6 max-w-xl">
            Almuerzos caseros con sabor caribeño auténtico, preparados al día con ingredientes frescos y entregados calientes a tu casa u oficina.
          </p>
          <div className="flex flex-wrap items-center gap-md">
            <a
              href="#menu-seccion"
              className="bg-secondary-container text-on-secondary-container font-label-sm px-6 py-3 rounded-full hover:bg-secondary-container/95 active:scale-95 transition-all shadow-md font-bold text-sm"
            >
              Haz tu pedido ahora
            </a>
            <div className="flex items-center gap-sm bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10 text-xs">
              <span className="font-medium text-white/80">Pagos seguros:</span>
              <span className="font-bold text-white flex items-center gap-2">
                Nequi • Daviplata • Efectivo
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Category Selection Section */}
      <section id="menu-seccion" className="scroll-mt-24">
        <div className="text-center md:text-left mb-6">
          <h2 className="font-display-lg text-2xl md:text-3xl text-on-background font-bold">
            Elige cómo quieres ordenar
          </h2>
          <p className="font-body-md text-on-surface-variant mt-1">
            Haz tu pedido para hoy o prográmalo para mañana con la mayor frescura
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-8">
          {/* Card 1: Platos ya hechos */}
          <button
            onClick={() => setActiveTab('prepared')}
            className={`flex items-start gap-md p-6 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'prepared'
                ? 'bg-surface-container-lowest border-primary shadow-soft-lift ring-1 ring-primary'
                : 'bg-surface border-outline-variant hover:border-primary/50'
            }`}
          >
            <div className={`p-3 rounded-xl ${activeTab === 'prepared' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
            </div>
            <div>
              <h3 className="font-title-md text-lg text-on-surface font-bold">Platos ya hechos</h3>
              <p className="font-caption text-on-surface-variant mt-1">
                Recetas tradicionales listas para disfrutar: bandeja paisa, mojarra frita, carnes y pescados frescos.
              </p>
              {activeTab === 'prepared' && (
                <span className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  Viendo esta sección
                </span>
              )}
            </div>
          </button>

          {/* Card 2: Ármate un plato */}
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex items-start gap-md p-6 rounded-2xl border text-left transition-all cursor-pointer ${
              activeTab === 'custom'
                ? 'bg-surface-container-lowest border-primary shadow-soft-lift ring-1 ring-primary'
                : 'bg-surface border-outline-variant hover:border-primary/50'
            }`}
          >
            <div className={`p-3 rounded-xl ${activeTab === 'custom' ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <div>
              <h3 className="font-title-md text-lg text-on-surface font-bold">Ármate un plato</h3>
              <p className="font-caption text-on-surface-variant mt-1">
                Elige tu base de arroz, proteína preferida, acompañamiento, bebida y extras al gusto.
              </p>
              {activeTab === 'custom' && (
                <span className="inline-flex items-center gap-1 text-xs text-primary font-bold mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  Viendo esta sección
                </span>
              )}
            </div>
          </button>
        </div>
      </section>

      {/* Main Tab Content */}
      {activeTab === 'prepared' ? (
        <div>
          {/* Dish Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {preparedDishes.map((dish) => {
              const isAvailable = dish.stock > 0;
              const isLowStock = dish.stock > 0 && dish.stock <= 5;
              
              // Dynamic portion text
              const portionText = dish.nombre.toLowerCase().includes('mojarra') || dish.nombre.toLowerCase().includes('bandeja') || dish.nombre.toLowerCase().includes('familiar')
                ? 'Porción: 1-2 personas'
                : 'Porción: 1 persona';

              // Benefit-oriented copy fallback
              const benefitText = dish.nombre.toLowerCase().includes('costeño')
                ? 'Perfecta para un almuerzo costeño auténtico.'
                : dish.nombre.toLowerCase().includes('pescado') || dish.nombre.toLowerCase().includes('mojarra')
                ? 'Fresco del mar, ideal para compartir en casa.'
                : 'Receta tradicional elaborada con ingredientes frescos.';

              return (
                <article
                  key={dish.id}
                  onClick={() => isAvailable && handleAddPrepared(dish)}
                  className={`bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col relative border border-outline-variant/30 soft-lift shadow-sm animate-card-in ${
                    isAvailable ? 'cursor-pointer' : 'opacity-85 grayscale-[20%]'
                  }`}
                  style={{ animationDelay: `${preparedDishes.indexOf(dish) * 80}ms` }}
                >
                  <div className="h-48 w-full relative">
                    <img
                      className="w-full h-full object-cover"
                      alt={dish.nombre}
                      src={dish.foto || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600'}
                      loading="lazy"
                    />
                    
                    {/* Color-coded Availability Badge */}
                    <div className="absolute top-sm left-sm z-10">
                      {isAvailable ? (
                        isLowStock ? (
                          <div className="bg-orange-600 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            ¡Solo quedan {dish.stock}!
                          </div>
                        ) : (
                          <div className="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                            Disponible
                          </div>
                        )
                      ) : (
                        <div className="bg-error text-white px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md">
                          Agotado
                        </div>
                      )}
                    </div>

                    {/* Portion Range Badge */}
                    <div className="absolute bottom-sm right-sm z-10 bg-black/60 backdrop-blur-sm text-white px-2.5 py-0.5 rounded text-[11px] font-semibold">
                      {portionText}
                    </div>
                  </div>
                  <div className="p-md flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-md text-lg text-on-surface font-extrabold leading-tight mb-1">{dish.nombre}</h3>
                      <p className="font-caption text-on-surface-variant text-sm line-clamp-2 mb-2 leading-relaxed">
                        {dish.descripcion}
                      </p>
                      <p className="font-caption text-primary/80 text-[11px] italic font-semibold mb-md">
                        {benefitText}
                      </p>
                    </div>
                    <div className="flex justify-between items-center mt-auto border-t border-outline-variant/10 pt-sm">
                      <div className="flex flex-col">
                        <span className="font-caption text-[10px] text-on-surface-variant/70 uppercase tracking-wider font-bold">
                          Precio
                        </span>
                        <span className="font-title-md text-lg text-primary font-black">
                          ${dish.precio.toLocaleString('es-CO')}
                        </span>
                      </div>
                      {isAvailable ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPrepared(dish);
                          }}
                          className="bg-primary hover:bg-primary-container text-on-primary font-bold text-xs px-4 py-2.5 rounded-full shadow-sm hover:shadow-md transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                          Agregar
                        </button>
                      ) : (
                        <span className="bg-surface-container-high text-on-surface-variant/40 font-bold text-xs px-4 py-2.5 rounded-full cursor-not-allowed">
                          Agotado
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-surface-container-lowest p-lg rounded-2xl shadow-sm border border-outline-variant/30">
          <h2 className="font-title-md text-primary mb-2">Arma tu Almuerzo Personalizado</h2>
          <p className="font-body-md text-on-surface-variant mb-6">
            Selecciona las opciones para construir tu plato del día. Base: <strong>${BASE_CUSTOM_PLATE_PRICE.toLocaleString('es-CO')} COP</strong>.
          </p>

          {/* Groups Customizer */}
          <div className="flex flex-col gap-lg">
            {['Arroz', 'Proteína', 'Acompañamiento', 'Bebida', 'Ensalada', 'Sopa', 'Postre'].map((group) => {
              const options = getOptionsByGroup(group);
              const isRequired = ['Arroz', 'Proteína', 'Acompañamiento', 'Bebida'].includes(group);

              return (
                <div key={group} className="border-b border-outline-variant/20 pb-md">
                  <h3 className="font-label-sm text-on-background mb-sm flex items-center gap-1">
                    {group}
                    {isRequired && <span className="text-error">*</span>}
                    <span className="font-caption font-normal text-on-surface-variant">
                      ({isRequired ? 'Obligatorio' : 'Opcional'})
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 gap-sm">
                    {options.map((opt) => {
                      const isSelected = customSelections[group as keyof typeof customSelections] === opt.nombre;
                      const hasStock = opt.stock > 0;
                      const extraCost = opt.precio_adicional > 0 ? ` (+ $${opt.precio_adicional.toLocaleString('es-CO')})` : '';

                      return (
                        <button
                          key={opt.id}
                          disabled={!hasStock}
                          onClick={() => handleCustomSelectionChange(group, opt.nombre)}
                          className={`flex flex-col p-md rounded-xl text-left border transition-all ${
                            !hasStock
                              ? 'bg-surface-container-low border-outline-variant/30 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary border-primary text-on-primary font-semibold shadow-sm'
                              : 'bg-surface border-outline hover:border-primary cursor-pointer'
                          }`}
                        >
                          <span className="font-body-md flex justify-between items-center w-full">
                            <span className={isSelected ? 'text-white' : 'text-on-surface'}>{opt.nombre}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[18px] text-white">check_circle</span>
                            )}
                          </span>
                          <span className={`font-caption mt-1 ${isSelected ? 'text-white/80' : 'text-on-surface-variant'}`}>
                            {!hasStock 
                              ? '❌ Agotado' 
                              : opt.stock > 0 && opt.stock <= 5 && opt.nombre !== 'Sin ensalada' && opt.nombre !== 'Sin sopa' && opt.nombre !== 'Sin postre'
                                ? `⚠️ ¡Solo ${opt.stock}!${extraCost || ' Sin costo adicional'}`
                                : `${extraCost || 'Sin costo adicional'}`
                            }
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Observaciones */}
            <div className="flex flex-col gap-sm">
              <label htmlFor="custom-notes" className="font-label-sm text-on-background">
                Observaciones especiales
              </label>
              <textarea
                id="custom-notes"
                rows={3}
                placeholder="Ej. Sin cebolla en la ensalada, el jugo que sea sin azúcar, etc."
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                className="bg-surface rounded-xl border border-outline p-md text-body-md focus:border-primary focus:outline-none"
              ></textarea>
            </div>

            {/* Order Summary & CTA */}
            <div className="bg-surface-container p-md rounded-xl flex flex-col md:flex-row justify-between items-center gap-md mt-md">
              <div>
                <span className="font-caption text-on-surface-variant">Precio total del plato</span>
                <div className="font-display-lg text-primary font-bold">
                  ${getCustomTotalPrice().toLocaleString('es-CO')}
                </div>
              </div>
              <button
                onClick={submitCustomToCart}
                className="w-full md:w-auto bg-primary text-on-primary font-bold text-xs px-6 py-3.5 rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                Agregar al pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prepared Dish Quantity Selector Modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-md">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-lg shadow-xl border border-outline-variant/30 flex flex-col gap-md">
            <div>
              <h3 className="font-title-md text-on-background">{selectedDish.nombre}</h3>
              <p className="font-caption text-on-surface-variant mt-1">{selectedDish.descripcion}</p>
            </div>
            
            {/* Quantity Selector */}
            <div className="flex justify-between items-center my-sm">
              <span className="font-label-sm">Cantidad:</span>
              <div className="flex items-center gap-md">
                <button
                  disabled={dishQuantity <= 1}
                  onClick={() => setDishQuantity(prev => Math.max(1, prev - 1))}
                  className="w-8 h-8 rounded-full border border-outline flex items-center justify-center font-bold disabled:opacity-50 cursor-pointer"
                >
                  -
                </button>
                <span className="font-title-md font-bold w-6 text-center">{dishQuantity}</span>
                <button
                  disabled={dishQuantity >= selectedDish.stock}
                  onClick={() => setDishQuantity(prev => Math.min(selectedDish.stock, prev + 1))}
                  className="w-8 h-8 rounded-full border border-outline flex items-center justify-center font-bold disabled:opacity-50 cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-xs">
              <label htmlFor="dish-notes" className="font-caption font-bold text-on-surface-variant">
                Observaciones especiales
              </label>
              <input
                id="dish-notes"
                type="text"
                placeholder="Ej. Sopa sin ensalada, etc."
                value={dishNotes}
                onChange={(e) => setDishNotes(e.target.value)}
                className="bg-surface rounded-lg border border-outline px-sm py-2 text-body-md focus:border-primary focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-sm mt-md">
              <button
                onClick={() => setSelectedDish(null)}
                className="flex-1 bg-surface-container text-on-surface-variant py-sm rounded-full font-label-sm border border-outline-variant hover:bg-surface-container-high cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={submitPreparedToCart}
                className="flex-1 bg-primary text-on-primary py-3 rounded-full font-bold text-xs hover:bg-primary-container active:scale-95 transition-all cursor-pointer"
              >
                Añadir al carrito (${(selectedDish.precio * dishQuantity).toLocaleString('es-CO')})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trust & Verification Section */}
      <section className="mt-16 bg-surface-container-low rounded-3xl p-8 md:p-12 border border-outline-variant/30 flex flex-col gap-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {/* Col 1 */}
          <div className="flex flex-col gap-sm">
            <h3 className="font-title-md text-lg text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">info</span>
              ¿Quiénes somos?
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              En <strong>Super IN</strong> nos apasiona llevar la sazón casera y tradicional del Caribe a tu mesa. Cocinamos cada plato al día con ingredientes frescos comprados a productores locales en Barranquilla, garantizando un almuerzo contundente y lleno de amor.
            </p>
          </div>
          {/* Col 2 */}
          <div className="flex flex-col gap-sm">
            <h3 className="font-title-md text-lg text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">schedule</span>
              Horarios y Entregas
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              <strong>Horario de atención:</strong> Lunes a Domingo de 10:00 AM a 3:00 PM.<br />
              <strong>Franjas horarias:</strong> Despachamos en intervalos de 15 minutos para asegurar que tu comida llegue caliente y a tiempo.
            </p>
          </div>
          {/* Col 3 */}
          <div className="flex flex-col gap-sm">
            <h3 className="font-title-md text-lg text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">verified_user</span>
              Garantía de Confianza
            </h3>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              <strong>Cobertura:</strong> Domicilios con entrega rápida en todo Barranquilla y Soledad.<br />
              <strong>Métodos de Pago:</strong> Recibimos efectivo, transferencia Bancolombia, Nequi y Daviplata de forma rápida y segura.
            </p>
          </div>
        </div>

        {/* Medios de Pago visual badges */}
        <div className="border-t border-outline-variant/30 pt-lg flex flex-col md:flex-row justify-between items-center gap-md">
          <span className="font-label-sm text-xs text-on-surface-variant font-semibold">
            Medios de pago 100% seguros y verificados:
          </span>
          <div className="flex flex-wrap gap-sm justify-center">
            <span className="bg-white px-3 py-1.5 rounded-lg border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Nequi
            </span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Daviplata
            </span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Transferencia Bancolombia
            </span>
            <span className="bg-white px-3 py-1.5 rounded-lg border border-outline-variant text-[11px] font-bold text-on-surface flex items-center gap-1 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Efectivo
            </span>
          </div>
        </div>
      </section>

      {/* Floating Bottom Action Bar (Mobile cart summary) */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-[92%] max-w-md z-40 md:hidden">
          <Link
            href="/carrito"
            className="w-full bg-secondary-container text-on-secondary-container font-label-sm py-3.5 px-6 rounded-full shadow-[0_8px_30px_rgb(255,182,40,0.3)] border border-secondary-container/20 flex justify-between items-center active:scale-[0.98] transition-transform font-bold"
          >
            <span className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                shopping_bag
              </span>
              Ver mi pedido ({cartCount})
            </span>
            <span className="font-black text-sm">${cartTotal.toLocaleString('es-CO')} COP</span>
          </Link>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-primary-container text-on-primary-container px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-sm animate-toast-in border border-outline-variant/30 max-w-sm w-[90%] md:w-auto">
          <span className="material-symbols-outlined text-secondary-container">check_circle</span>
          <span className="font-label-sm font-bold text-sm text-white">{toastMessage}</span>
        </div>
      )}

    </div>
  );
}
