'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Categoria {
  id: number;
  nombre: string;
  tipo: string;
}

interface Producto {
  id: string;
  categoria_id: number | null;
  nombre: string;
  descripcion: string;
  precio: number;
  foto: string | null;
  stock: number;
  activo: boolean;
  dias?: string[];
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface OpcionPlato {
  id: string;
  grupo: string;
  nombre: string;
  precio_adicional: number;
  stock: number;
  activo: boolean;
  orden: number;
}

export default function AdminMenuPage() {
  const [activeTab, setActiveTab] = useState<'productos' | 'opciones'>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [opciones, setOpciones] = useState<OpcionPlato[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // New day filtering states
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('Todos');

  // New photo upload and day assignment states
  const [newProdFoto, setNewProdFoto] = useState('');
  const [newProdDias, setNewProdDias] = useState<string[]>([]);
  const [editProdDias, setEditProdDias] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Modal states
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [showAddOptModal, setShowAddOptModal] = useState(false);

  // Edit states
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [editProdNombre, setEditProdNombre] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdPrecio, setEditProdPrecio] = useState('');
  const [editProdStock, setEditProdStock] = useState('');
  const [editProdCat, setEditProdCat] = useState('');
  const [editProdFoto, setEditProdFoto] = useState('');

  const [editingOption, setEditingOption] = useState<OpcionPlato | null>(null);
  const [editOptNombre, setEditOptNombre] = useState('');
  const [editOptGrupo, setEditOptGrupo] = useState('Proteína');
  const [editOptPrecio, setEditOptPrecio] = useState('');
  const [editOptStock, setEditOptStock] = useState('');

  // New product inputs
  const [newProdNombre, setNewProdNombre] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrecio, setNewProdPrecio] = useState('');
  const [newProdStock, setNewProdStock] = useState('20');
  const [newProdCat, setNewProdCat] = useState('');

  // New option inputs
  const [newOptNombre, setNewOptNombre] = useState('');
  const [newOptGrupo, setNewOptGrupo] = useState('Proteína');
  const [newOptPrecio, setNewOptPrecio] = useState('0');
  const [newOptStock, setNewOptStock] = useState('20');

  useEffect(() => {
    fetchMenuData();
  }, []);

  async function fetchMenuData() {
    setLoading(true);
    try {
      const { data: prodData } = await supabase.from('productos').select('*').order('nombre');
      const { data: optData } = await supabase.from('opciones_plato').select('*').order('grupo').order('orden');
      const { data: catData } = await supabase.from('categorias').select('*').order('nombre');

      if (prodData) setProductos(prodData as Producto[]);
      if (optData) setOpciones(optData as OpcionPlato[]);
      if (catData) setCategorias(catData as Categoria[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Handle prepared product status change
  const handleToggleProductActive = async (id: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ activo: !currentVal })
        .eq('id', id);

      if (error) throw error;
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, activo: !currentVal } : p))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle prepared product stock change
  const handleUpdateProductStock = async (id: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('productos')
        .update({ stock: Math.max(0, newStock) })
        .eq('id', id);

      if (error) throw error;
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? { ...p, stock: Math.max(0, newStock) } : p))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle customizable plate option status change
  const handleToggleOptionActive = async (id: string, currentVal: boolean) => {
    try {
      const { error } = await supabase
        .from('opciones_plato')
        .update({ activo: !currentVal })
        .eq('id', id);

      if (error) throw error;
      setOpciones((prev) =>
        prev.map((o) => (o.id === id ? { ...o, activo: !currentVal } : o))
      );
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Handle option stock change + Dependency checks (protein out of stock)
  const handleUpdateOptionStock = async (option: OpcionPlato, newStock: number) => {
    const finalStock = Math.max(0, newStock);
    try {
      // 1. Update option stock
      const { error } = await supabase
        .from('opciones_plato')
        .update({ stock: finalStock })
        .eq('id', option.id);

      if (error) throw error;

      setOpciones((prev) =>
        prev.map((o) => (o.id === option.id ? { ...o, stock: finalStock } : o))
      );

      // 2. Dependency Check: If a Protein option goes to 0 or becomes out of stock,
      // find prepared dishes containing that protein's name (case-insensitive) and set their stock to 0.
      if (option.grupo === 'Proteína' && finalStock === 0) {
        const keyword = option.nombre.toLowerCase().trim();
        const matches = productos.filter(
          (p) => p.nombre.toLowerCase().includes(keyword) || p.descripcion.toLowerCase().includes(keyword)
        );

        if (matches.length > 0) {
          const matchIds = matches.map((m) => m.id);
          const { error: batchErr } = await supabase
            .from('productos')
            .update({ stock: 0 })
            .in('id', matchIds);

          if (batchErr) throw batchErr;

          setProductos((prev) =>
            prev.map((p) => (matchIds.includes(p.id) ? { ...p, stock: 0 } : p))
          );

          alert(
            `¡Regla de stock activa! Como se agotó la proteína "${option.nombre}", se redujo a 0 el stock de los siguientes platos preparados asociados:\n` +
              matches.map((m) => `• ${m.nombre}`).join('\n')
          );
        }
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create prepared product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdNombre.trim() || !newProdPrecio.trim()) return;

    try {
      const { data, error } = await supabase
        .from('productos')
        .insert({
          nombre: newProdNombre,
          descripcion: newProdDesc,
          precio: parseInt(newProdPrecio, 10),
          stock: parseInt(newProdStock, 10) || 0,
          categoria_id: newProdCat ? parseInt(newProdCat, 10) : null,
          activo: true,
          foto: newProdFoto || null,
          dias: newProdDias
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProductos((prev) => [...prev, data as Producto]);
        setShowAddProdModal(false);
        setNewProdNombre('');
        setNewProdDesc('');
        setNewProdPrecio('');
        setNewProdStock('20');
        setNewProdCat('');
        setNewProdFoto('');
        setNewProdDias([]);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create customizable plate option
  const handleCreateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOptNombre.trim()) return;

    try {
      const { data, error } = await supabase
        .from('opciones_plato')
        .insert({
          nombre: newOptNombre,
          grupo: newOptGrupo,
          precio_adicional: parseInt(newOptPrecio, 10) || 0,
          stock: parseInt(newOptStock, 10) || 0,
          activo: true,
          orden: 0
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setOpciones((prev) => [...prev, data as OpcionPlato]);
        setShowAddOptModal(false);
        setNewOptNombre('');
        setNewOptGrupo('Proteína');
        setNewOptPrecio('0');
        setNewOptStock('20');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `plato-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('imagenes-menu')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('imagenes-menu')
        .getPublicUrl(filePath);

      if (isEdit) {
        setEditProdFoto(data.publicUrl);
      } else {
        setNewProdFoto(data.publicUrl);
      }
    } catch (err: any) {
      alert('Error subiendo imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Start editing a product
  const startEditProduct = (p: Producto) => {
    setEditingProduct(p);
    setEditProdNombre(p.nombre);
    setEditProdDesc(p.descripcion || '');
    setEditProdPrecio(p.precio.toString());
    setEditProdStock(p.stock.toString());
    setEditProdCat(p.categoria_id ? p.categoria_id.toString() : '');
    setEditProdFoto(p.foto || '');
    setEditProdDias(p.dias || []);
  };

  // Save edited product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editProdNombre.trim() || !editProdPrecio.trim()) return;

    try {
      const { data, error } = await supabase
        .from('productos')
        .update({
          nombre: editProdNombre,
          descripcion: editProdDesc,
          precio: parseInt(editProdPrecio, 10),
          stock: parseInt(editProdStock, 10) || 0,
          categoria_id: editProdCat ? parseInt(editProdCat, 10) : null,
          foto: editProdFoto || null,
          dias: editProdDias
        })
        .eq('id', editingProduct.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setProductos((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? (data as Producto) : p))
        );
        setEditingProduct(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Start editing an option
  const startEditOption = (o: OpcionPlato) => {
    setEditingOption(o);
    setEditOptNombre(o.nombre);
    setEditOptGrupo(o.grupo);
    setEditOptPrecio(o.precio_adicional.toString());
    setEditOptStock(o.stock.toString());
  };

  // Save edited option
  const handleUpdateOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOption || !editOptNombre.trim()) return;

    try {
      const { data, error } = await supabase
        .from('opciones_plato')
        .update({
          nombre: editOptNombre,
          grupo: editOptGrupo,
          precio_adicional: parseInt(editOptPrecio, 10) || 0,
          stock: parseInt(editOptStock, 10) || 0
        })
        .eq('id', editingOption.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setOpciones((prev) =>
          prev.map((o) => (o.id === editingOption.id ? (data as OpcionPlato) : o))
        );
        setEditingOption(null);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string) => {
    const conf = confirm('¿Estás seguro de que deseas eliminar este producto?');
    if (!conf) return;

    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      setProductos((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete option
  const handleDeleteOption = async (id: string) => {
    const conf = confirm('¿Estás seguro de que deseas eliminar esta opción?');
    if (!conf) return;

    try {
      const { error } = await supabase.from('opciones_plato').delete().eq('id', id);
      if (error) throw error;
      setOpciones((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Search and day filter
  const filteredProducts = productos.filter((p) => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (selectedDayFilter === 'Todos') return true;
    if (selectedDayFilter === 'Sin asignar') return !p.dias || p.dias.length === 0;
    return p.dias && p.dias.includes(selectedDayFilter);
  });

  const filteredOpciones = opciones.filter((o) =>
    o.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.grupo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-grow flex flex-col h-full bg-background overflow-hidden relative">
      {/* Header */}
      <header className="h-20 px-lg flex items-center justify-between border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md z-10 flex-shrink-0">
        <div>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">Gestión de Menú y Stock</h2>
          <p className="font-caption text-caption text-on-surface-variant">Modifica el catálogo y las opciones armables</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">
              search
            </span>
            <input
              type="text"
              placeholder="Buscar plato u opción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline rounded-full font-body-md text-sm focus:border-primary focus:outline-none"
            />
          </div>

          {activeTab === 'productos' ? (
            <button
              onClick={() => setShowAddProdModal(true)}
              className="bg-primary text-on-primary text-xs font-bold py-2.5 px-5 rounded-full flex items-center gap-1 hover:bg-primary-container cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nuevo Plato
            </button>
          ) : (
            <button
              onClick={() => setShowAddOptModal(true)}
              className="bg-primary text-on-primary text-xs font-bold py-2.5 px-5 rounded-full flex items-center gap-1 hover:bg-primary-container cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Nueva Opción
            </button>
          )}
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-surface-container px-lg border-b border-outline-variant/30 flex-shrink-0">
        <button
          onClick={() => setActiveTab('productos')}
          className={`py-3 px-md text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'productos' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Platos ya hechos
        </button>
        <button
          onClick={() => setActiveTab('opciones')}
          className={`py-3 px-md text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'opciones' ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
          }`}
        >
          Opciones "Ármate un plato"
        </button>
      </div>

      {activeTab === 'productos' && (
        <div className="flex flex-wrap gap-xs bg-surface-container-low px-lg py-2 border-b border-outline-variant/30 flex-shrink-0">
          {['Todos', ...DIAS_SEMANA, 'Sin asignar'].map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDayFilter(day)}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-full transition-all cursor-pointer ${
                selectedDayFilter === day
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface hover:bg-surface-variant text-on-surface-variant'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      {/* Table Area */}
      <div className="flex-1 p-lg overflow-y-auto bg-surface-container-low/20">
        {loading ? (
          <div className="text-center py-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary mx-auto"></div>
          </div>
        ) : activeTab === 'productos' ? (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/30">
                <tr>
                  <th className="p-md font-bold">Nombre del Plato</th>
                  <th className="p-md font-bold">Precio</th>
                  <th className="p-md font-bold text-center">Stock</th>
                  <th className="p-md font-bold text-center">Estado</th>
                  <th className="p-md font-bold text-center w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-container-low/10 transition-colors">
                    <td className="p-md">
                      <p className="font-bold text-sm text-on-background">{p.nombre}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{p.descripcion || 'Sin descripción'}</p>
                      {p.dias && p.dias.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {p.dias.map((d) => (
                            <span key={d} className="bg-primary/10 text-primary text-[9px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-md font-bold text-primary">${p.precio.toLocaleString('es-CO')}</td>
                    <td className="p-md text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleUpdateProductStock(p.id, p.stock - 1)}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-on-surface"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-sm">{p.stock}</span>
                        <button
                          onClick={() => handleUpdateProductStock(p.id, p.stock + 1)}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-on-surface"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-md text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.activo && p.stock > 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-error-container text-error'
                        }`}
                      >
                        {p.activo && p.stock > 0 ? 'Disponible' : 'Agotado'}
                      </span>
                    </td>
                    <td className="p-md text-center">
                      <div className="flex justify-center items-center gap-md">
                        <button
                          onClick={() => handleToggleProductActive(p.id, p.activo)}
                          className={`text-xs font-semibold px-3 py-1 rounded-full cursor-pointer border ${
                            p.activo
                              ? 'border-error text-error hover:bg-error-container/10'
                              : 'border-primary text-primary hover:bg-primary-container/10'
                          }`}
                        >
                          {p.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => startEditProduct(p)}
                          className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-on-surface-variant hover:text-error transition-colors flex items-center justify-center"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-container-low/50 border-b border-outline-variant/30">
                <tr>
                  <th className="p-md font-bold">Grupo</th>
                  <th className="p-md font-bold">Nombre de Opción</th>
                  <th className="p-md font-bold text-right">Precio Adic.</th>
                  <th className="p-md font-bold text-center">Stock</th>
                  <th className="p-md font-bold text-center">Estado</th>
                  <th className="p-md font-bold text-center w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filteredOpciones.map((o) => (
                  <tr key={o.id} className="hover:bg-surface-container-low/10 transition-colors">
                    <td className="p-md">
                      <span className="bg-surface-variant px-2.5 py-0.5 rounded-full text-[10px] font-bold text-on-surface">
                        {o.grupo}
                      </span>
                    </td>
                    <td className="p-md font-bold text-sm text-on-background">{o.nombre}</td>
                    <td className="p-md text-right font-bold text-primary">
                      +${o.precio_adicional.toLocaleString('es-CO')}
                    </td>
                    <td className="p-md text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleUpdateOptionStock(o, o.stock - 1)}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-on-surface"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-bold text-sm">{o.stock}</span>
                        <button
                          onClick={() => handleUpdateOptionStock(o, o.stock + 1)}
                          className="w-6 h-6 rounded bg-surface-container flex items-center justify-center font-bold text-on-surface"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-md text-center">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.activo && o.stock > 0
                            ? 'bg-primary/10 text-primary'
                            : 'bg-error-container text-error'
                        }`}
                      >
                        {o.activo && o.stock > 0 ? 'Disponible' : 'Agotado'}
                      </span>
                    </td>
                    <td className="p-md text-center">
                      <div className="flex justify-center items-center gap-md">
                        <button
                          onClick={() => handleToggleOptionActive(o.id, o.activo)}
                          className={`text-xs font-semibold px-3 py-1 rounded-full cursor-pointer border ${
                            o.activo
                              ? 'border-error text-error hover:bg-error-container/10'
                              : 'border-primary text-primary hover:bg-primary-container/10'
                          }`}
                        >
                          {o.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => startEditOption(o)}
                          className="text-on-surface-variant hover:text-primary transition-colors flex items-center justify-center"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteOption(o.id)}
                          className="text-on-surface-variant hover:text-error transition-colors flex items-center justify-center"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateProduct}
            className="bg-surface-container-lowest max-w-sm w-full p-lg rounded-2xl border border-outline-variant shadow-xl flex flex-col gap-md text-xs"
          >
            <h3 className="font-title-md text-primary font-bold text-sm">Agregar Nuevo Plato</h3>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Nombre del plato</label>
              <input
                required
                type="text"
                placeholder="Ej: Mojarra Frita"
                value={newProdNombre}
                onChange={(e) => setNewProdNombre(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Descripción</label>
              <textarea
                placeholder="Ej: Acompañado de arroz con coco..."
                value={newProdDesc}
                onChange={(e) => setNewProdDesc(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Precio (COP)</label>
                <input
                  required
                  type="number"
                  placeholder="25000"
                  value={newProdPrecio}
                  onChange={(e) => setNewProdPrecio(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Stock Inicial</label>
                <input
                  type="number"
                  value={newProdStock}
                  onChange={(e) => setNewProdStock(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Categoría</label>
              <select
                value={newProdCat}
                onChange={(e) => setNewProdCat(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-surface"
              >
                <option value="">Selecciona una categoría...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Days Assignment */}
            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Días de disponibilidad</label>
              <div className="grid grid-cols-4 gap-xs mt-1">
                {DIAS_SEMANA.map((day) => {
                  const isChecked = newProdDias.includes(day);
                  return (
                    <label key={day} className={`flex items-center justify-center p-1 rounded-md text-[10px] font-bold border cursor-pointer select-none ${
                      isChecked ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline text-on-surface-variant'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setNewProdDias(prev => prev.filter(d => d !== day));
                          } else {
                            setNewProdDias(prev => [...prev, day]);
                          }
                        }}
                        className="hidden"
                      />
                      {day.substring(0, 3)}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Photo Upload with Preview */}
            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Foto del plato</label>
              <div className="flex items-center gap-sm">
                {newProdFoto ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-outline-variant flex-shrink-0">
                    <img src={newProdFoto} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setNewProdFoto('')}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[8px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-surface-container rounded-lg border border-dashed border-outline flex items-center justify-center text-on-surface-variant flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">image</span>
                  </div>
                )}
                <div className="flex-grow">
                  <label className="bg-surface hover:bg-surface-variant border border-outline rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer inline-block text-on-surface">
                    {uploading ? 'Subiendo...' : 'Subir Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, false)}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <input
                type="text"
                placeholder="O pega URL de la imagen aquí..."
                value={newProdFoto}
                onChange={(e) => setNewProdFoto(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background mt-1"
              />
            </div>

            <div className="flex gap-sm mt-lg">
              <button
                type="button"
                onClick={() => setShowAddProdModal(false)}
                className="flex-1 border border-outline text-on-surface text-xs font-bold py-3 rounded-full hover:bg-surface-container-high"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Option Modal */}
      {showAddOptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateOption}
            className="bg-surface-container-lowest max-w-sm w-full p-lg rounded-2xl border border-outline-variant shadow-xl flex flex-col gap-md text-xs"
          >
            <h3 className="font-title-md text-primary font-bold text-sm">Agregar Nueva Opción</h3>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Nombre del ingrediente</label>
              <input
                required
                type="text"
                placeholder="Ej: Pescado Frito"
                value={newOptNombre}
                onChange={(e) => setNewOptNombre(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs"
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Grupo / Categoría de ingrediente</label>
              <select
                value={newOptGrupo}
                onChange={(e) => setNewOptGrupo(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-surface"
              >
                <option value="Proteína">Proteína</option>
                <option value="Arroz">Arroz</option>
                <option value="Acompañamiento">Acompañamiento</option>
                <option value="Ensalada">Ensalada</option>
                <option value="Sopa">Sopa</option>
                <option value="Postre">Postre</option>
                <option value="Bebida">Bebida</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Precio Adicional</label>
                <input
                  type="number"
                  placeholder="0"
                  value={newOptPrecio}
                  onChange={(e) => setNewOptPrecio(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Stock Inicial</label>
                <input
                  type="number"
                  value={newOptStock}
                  onChange={(e) => setNewOptStock(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-sm mt-lg">
              <button
                type="button"
                onClick={() => setShowAddOptModal(false)}
                className="flex-1 border border-outline text-on-surface text-xs font-bold py-3 rounded-full hover:bg-surface-container-high"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleUpdateProduct}
            className="bg-surface-container-lowest max-w-sm w-full p-lg rounded-2xl border border-outline-variant shadow-xl flex flex-col gap-md text-xs"
          >
            <h3 className="font-title-md text-primary font-bold text-sm">Editar Plato</h3>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Nombre del plato</label>
              <input
                required
                type="text"
                value={editProdNombre}
                onChange={(e) => setEditProdNombre(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background"
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Descripción</label>
              <textarea
                placeholder="Sin descripción"
                value={editProdDesc}
                onChange={(e) => setEditProdDesc(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Precio (COP)</label>
                <input
                  required
                  type="number"
                  value={editProdPrecio}
                  onChange={(e) => setEditProdPrecio(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Stock</label>
                <input
                  type="number"
                  value={editProdStock}
                  onChange={(e) => setEditProdStock(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background"
                />
              </div>
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Categoría</label>
              <select
                value={editProdCat}
                onChange={(e) => setEditProdCat(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-surface"
              >
                <option value="">Selecciona una categoría...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Days Assignment */}
            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Días de disponibilidad</label>
              <div className="grid grid-cols-4 gap-xs mt-1">
                {DIAS_SEMANA.map((day) => {
                  const isChecked = editProdDias.includes(day);
                  return (
                    <label key={day} className={`flex items-center justify-center p-1 rounded-md text-[10px] font-bold border cursor-pointer select-none ${
                      isChecked ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-outline text-on-surface-variant'
                    }`}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setEditProdDias(prev => prev.filter(d => d !== day));
                          } else {
                            setEditProdDias(prev => [...prev, day]);
                          }
                        }}
                        className="hidden"
                      />
                      {day.substring(0, 3)}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Photo Upload with Preview */}
            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Foto del plato</label>
              <div className="flex items-center gap-sm">
                {editProdFoto ? (
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-outline-variant flex-shrink-0">
                    <img src={editProdFoto} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setEditProdFoto('')}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full p-0.5 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[8px]">close</span>
                    </button>
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-surface-container rounded-lg border border-dashed border-outline flex items-center justify-center text-on-surface-variant flex-shrink-0">
                    <span className="material-symbols-outlined text-sm">image</span>
                  </div>
                )}
                <div className="flex-grow">
                  <label className="bg-surface hover:bg-surface-variant border border-outline rounded-lg px-2.5 py-1.5 text-[10px] font-bold cursor-pointer inline-block text-on-surface">
                    {uploading ? 'Subiendo...' : 'Subir Foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleUploadImage(e, true)}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>
              <input
                type="text"
                placeholder="O pega URL de la imagen aquí..."
                value={editProdFoto}
                onChange={(e) => setEditProdFoto(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background mt-1"
              />
            </div>

            <div className="flex gap-sm mt-lg">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="flex-1 border border-outline text-on-surface text-xs font-bold py-3 rounded-full hover:bg-surface-container-high"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Option Modal */}
      {editingOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleUpdateOption}
            className="bg-surface-container-lowest max-w-sm w-full p-lg rounded-2xl border border-outline-variant shadow-xl flex flex-col gap-md text-xs"
          >
            <h3 className="font-title-md text-primary font-bold text-sm">Editar Opción de Plato</h3>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Nombre del ingrediente</label>
              <input
                required
                type="text"
                value={editOptNombre}
                onChange={(e) => setEditOptNombre(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background"
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label className="font-bold text-on-surface">Grupo / Categoría de ingrediente</label>
              <select
                value={editOptGrupo}
                onChange={(e) => setEditOptGrupo(e.target.value)}
                className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-surface"
              >
                <option value="Proteína">Proteína</option>
                <option value="Arroz">Arroz</option>
                <option value="Acompañamiento">Acompañamiento</option>
                <option value="Ensalada">Ensalada</option>
                <option value="Sopa">Sopa</option>
                <option value="Postre">Postre</option>
                <option value="Bebida">Bebida</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-sm">
              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Precio Adicional</label>
                <input
                  type="number"
                  value={editOptPrecio}
                  onChange={(e) => setEditOptPrecio(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background"
                />
              </div>

              <div className="flex flex-col gap-xs">
                <label className="font-bold text-on-surface">Stock</label>
                <input
                  type="number"
                  value={editOptStock}
                  onChange={(e) => setEditOptStock(e.target.value)}
                  className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs text-on-background"
                />
              </div>
            </div>

            <div className="flex gap-sm mt-lg">
              <button
                type="button"
                onClick={() => setEditingOption(null)}
                className="flex-1 border border-outline text-on-surface text-xs font-bold py-3 rounded-full hover:bg-surface-container-high"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-on-primary text-xs font-bold py-3 rounded-full hover:bg-primary-container"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
