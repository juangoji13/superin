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
    alert('¡Plato personalizado agregado al carrito!');
  };

  const getOptionsByGroup = (group: string) => {
    return customOptions.filter(option => option.grupo === group);
  };

  return (
    <div className="px-container-margin md:px-xl md:mt-6 mt-4 max-w-7xl mx-auto w-full pb-24">
      {/* Banner */}
      <section className="bg-primary-container text-on-primary-container rounded-xl p-md mb-lg flex items-center gap-sm">
        <span className="material-symbols-outlined">info</span>
        <p className="font-label-sm">Haz tu pedido para hoy o prográmalo para mañana</p>
      </section>

      {/* Tabs */}
      <div className="flex gap-sm mb-lg border-b border-outline-variant pb-3">
        <button
          onClick={() => setActiveTab('prepared')}
          className={`font-label-sm px-lg py-sm rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
            activeTab === 'prepared'
              ? 'bg-primary text-on-primary font-bold'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:bg-surface-container-high'
          }`}
        >
          Platos ya hechos
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`font-label-sm px-lg py-sm rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-primary text-on-primary font-bold'
              : 'bg-surface-container text-on-surface-variant border border-outline-variant hover:bg-surface-container-high'
          }`}
        >
          Ármate un plato
        </button>
      </div>

      {activeTab === 'prepared' ? (
        <div>
          <h2 className="font-title-md text-primary mb-md">Nuestros Platos del Día</h2>
          {/* Dish Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {preparedDishes.map((dish) => {
              const isAvailable = dish.stock > 0;
              return (
                <article
                  key={dish.id}
                  onClick={() => isAvailable && handleAddPrepared(dish)}
                  className={`bg-surface-container-lowest rounded-2xl overflow-hidden flex flex-col relative ${
                    isAvailable ? 'soft-lift cursor-pointer' : 'opacity-75 grayscale-[20%]'
                  }`}
                >
                  <div className="h-48 w-full relative">
                    <img
                      className="w-full h-full object-cover"
                      alt={dish.nombre}
                      src={dish.foto || '/fallback-food.jpg'}
                    />
                    {isAvailable ? (
                      <div className="absolute top-sm left-sm bg-surface/90 backdrop-blur-sm px-2 py-1 rounded-full border border-outline-variant flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-secondary-container"></div>
                        <span className="font-caption text-[11px] text-on-surface-variant">
                          {dish.stock} disponibles
                        </span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-surface/40 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="bg-error-container text-on-error-container font-bold text-xs px-md py-sm rounded-full">
                          AGOTADO
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-md flex-grow flex flex-col justify-between">
                    <div>
                      <h3 className="font-title-md text-on-background mb-1">{dish.nombre}</h3>
                      <p className="font-caption text-on-surface-variant line-clamp-2 mb-md">
                        {dish.descripcion}
                      </p>
                    </div>
                    <div className="flex justify-between items-end mt-auto">
                      <span className="font-title-md text-primary font-bold">
                        ${dish.precio.toLocaleString('es-CO')}
                      </span>
                      {isAvailable && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddPrepared(dish);
                          }}
                          className="bg-primary-container text-on-primary-container rounded-full p-2 hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
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
                              ? 'bg-primary-container border-primary text-primary-container font-semibold'
                              : 'bg-surface border-outline hover:border-primary cursor-pointer'
                          }`}
                        >
                          <span className="font-body-md text-on-surface flex justify-between items-center w-full">
                            {opt.nombre}
                            {isSelected && (
                              <span className="material-symbols-outlined text-[18px] text-primary">check_circle</span>
                            )}
                          </span>
                          <span className="font-caption text-on-surface-variant mt-1">
                            {!hasStock ? 'Agotado' : `${extraCost || 'Sin costo adicional'}`}
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
                className="w-full md:w-auto bg-primary text-on-primary font-label-sm px-lg py-md rounded-full hover:bg-primary-container active:scale-95 transition-all shadow-md cursor-pointer"
              >
                Agregar plato personalizado
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
                className="flex-1 bg-primary text-on-primary py-sm rounded-full font-label-sm hover:bg-primary-container active:scale-95 transition-all cursor-pointer"
              >
                Agregar (${(selectedDish.precio * dishQuantity).toLocaleString('es-CO')})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar (Mobile cart summary) */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 md:bottom-lg left-1/2 transform -translate-x-1/2 w-11/12 max-w-md z-40 md:hidden">
          <Link
            href="/carrito"
            className="w-full bg-primary text-on-primary font-label-sm py-md px-lg rounded-full shadow-lg flex justify-between items-center active:scale-[0.98] transition-transform"
          >
            <span className="flex items-center gap-sm">
              <span className="material-symbols-outlined" data-weight="fill">
                shopping_bag
              </span>
              Ver mi pedido ({cartCount})
            </span>
            <span className="font-bold">${cartTotal.toLocaleString('es-CO')}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
