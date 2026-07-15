'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BancoCuenta {
  banco: string;
  numero: string;
  titular: string;
}

export default function AdminAjustesPage() {
  const [whatsapp, setWhatsapp] = useState('573001234567');
  const [bancos, setBancos] = useState<BancoCuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingWa, setSavingWa] = useState(false);
  const [savingBancos, setSavingBancos] = useState(false);
  const [msgWa, setMsgWa] = useState({ text: '', type: '' });
  const [msgBancos, setMsgBancos] = useState({ text: '', type: '' });

  // Add new bank account form states
  const [newBanco, setNewBanco] = useState('');
  const [newNumero, setNewNumero] = useState('');
  const [newTitular, setNewTitular] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    try {
      // 1. Fetch WhatsApp
      const { data: waData } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'whatsapp_contacto')
        .single();
      
      if (waData?.valor && typeof waData.valor === 'object' && 'numero' in waData.valor) {
        setWhatsapp((waData.valor as any).numero || '573001234567');
      }

      // 2. Fetch Bank Details
      const { data: bData } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'datos_transferencia')
        .single();
      
      if (bData?.valor && typeof bData.valor === 'object' && 'bancos' in bData.valor) {
        setBancos((bData.valor as any).bancos || []);
      } else {
        // Fallback baseline data if not present in DB yet
        const defaultBancos = [
          { banco: 'Nequi', numero: '3001234567', titular: 'Super IN' },
          { banco: 'Bancolombia', numero: 'Ahorros 123-456789-01', titular: 'Super IN SAS' }
        ];
        setBancos(defaultBancos);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!whatsapp.trim()) return;

    setSavingWa(true);
    setMsgWa({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('configuracion')
        .upsert({
          clave: 'whatsapp_contacto',
          valor: { numero: whatsapp.replace(/\s+/g, '') }
        });

      if (error) throw error;
      setMsgWa({ text: 'WhatsApp guardado con éxito.', type: 'success' });
    } catch (err: any) {
      setMsgWa({ text: `Error: ${err.message}`, type: 'error' });
    } finally {
      setSavingWa(false);
    }
  };

  const handleAddBanco = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanco.trim() || !newNumero.trim() || !newTitular.trim()) {
      alert('Por favor completa todos los campos para agregar la cuenta bancaria.');
      return;
    }

    const updated = [
      ...bancos,
      { banco: newBanco.trim(), numero: newNumero.trim(), titular: newTitular.trim() }
    ];
    setBancos(updated);

    // Clear inputs
    setNewBanco('');
    setNewNumero('');
    setNewTitular('');
  };

  const handleRemoveBanco = (index: number) => {
    const updated = bancos.filter((_, i) => i !== index);
    setBancos(updated);
  };

  const handleSaveBancos = async () => {
    setSavingBancos(true);
    setMsgBancos({ text: '', type: '' });

    try {
      const { error } = await supabase
        .from('configuracion')
        .upsert({
          clave: 'datos_transferencia',
          valor: { bancos }
        });

      if (error) throw error;
      setMsgBancos({ text: 'Cuentas bancarias guardadas con éxito.', type: 'success' });
    } catch (err: any) {
      setMsgBancos({ text: `Error: ${err.message}`, type: 'error' });
    } finally {
      setSavingBancos(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col h-full bg-background overflow-hidden relative font-body-md">
      {/* Header */}
      <header className="h-20 px-lg flex items-center justify-between border-b border-outline-variant/30 bg-surface/80 backdrop-blur-md z-10 flex-shrink-0">
        <div>
          <h2 className="font-title-md text-title-md text-on-surface font-bold">Ajustes y Configuración</h2>
          <p className="font-caption text-caption text-on-surface-variant">Administra el número de contacto y cuentas de cobro</p>
        </div>
      </header>

      {/* Main Content Scrollable */}
      <div className="flex-1 p-lg overflow-y-auto bg-surface-container-low/20 flex flex-col gap-lg max-w-4xl w-full">
        {loading ? (
          <div className="text-center py-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary mx-auto"></div>
          </div>
        ) : (
          <>
            {/* WhatsApp Card */}
            <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg shadow-sm flex flex-col gap-md">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-xl">call</span>
                <h3 className="font-bold text-on-background text-sm">Contacto de WhatsApp</h3>
              </div>
              <p className="text-xs text-on-surface-variant">
                Define el número de WhatsApp al que llegarán los mensajes de confirmación de pedido de los clientes. Incluye el código de país sin el signo '+' (ej. 57 para Colombia).
              </p>

              <form onSubmit={handleSaveWhatsApp} className="flex gap-md items-end max-w-md mt-sm">
                <div className="flex-1 flex flex-col gap-xs">
                  <label className="text-xs font-semibold text-on-surface">Número de WhatsApp (con código de país)</label>
                  <input
                    required
                    type="text"
                    placeholder="Ej: 573001234567"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="bg-surface border border-outline rounded-lg px-4 py-2.5 text-xs text-on-surface focus:border-primary focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingWa}
                  className="bg-primary text-on-primary text-xs font-bold py-2.5 px-6 rounded-full hover:bg-primary-container disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingWa ? 'Guardando...' : 'Guardar'}
                </button>
              </form>

              {msgWa.text && (
                <div className={`text-xs font-bold mt-sm p-sm rounded-lg ${
                  msgWa.type === 'success' ? 'bg-primary-container/20 text-primary' : 'bg-error-container/20 text-error'
                }`}>
                  {msgWa.text}
                </div>
              )}
            </section>

            {/* Bank Transfer Accounts Card */}
            <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-lg shadow-sm flex flex-col gap-md">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-xl">account_balance</span>
                <h3 className="font-bold text-on-background text-sm">Cuentas para Transferencias Bancarias</h3>
              </div>
              <p className="text-xs text-on-surface-variant font-medium">
                Registra los canales disponibles para recibir pagos por transferencia. Estos detalles se mostrarán automáticamente en el carrito del cliente cuando elija transferir.
              </p>

              {/* Add Account Sub-form */}
              <form onSubmit={handleAddBanco} className="grid grid-cols-1 md:grid-cols-3 gap-md items-end bg-surface-container-low p-md rounded-xl border border-outline-variant/30 mt-sm">
                <div className="flex flex-col gap-xs">
                  <label className="text-xs font-bold text-on-surface">Banco / Plataforma</label>
                  <input
                    type="text"
                    placeholder="Ej: Nequi, Bancolombia"
                    value={newBanco}
                    onChange={(e) => setNewBanco(e.target.value)}
                    className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-xs font-bold text-on-surface">Número de Cuenta / Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej: 300 123 4567"
                    value={newNumero}
                    onChange={(e) => setNewNumero(e.target.value)}
                    className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-xs font-bold text-on-surface">Titular de la cuenta</label>
                  <input
                    type="text"
                    placeholder="Ej: Super IN SAS"
                    value={newTitular}
                    onChange={(e) => setNewTitular(e.target.value)}
                    className="bg-surface border border-outline rounded-lg px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="bg-primary text-on-primary text-xs font-bold py-2 px-5 rounded-full flex items-center gap-1 hover:bg-primary-container transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Añadir Cuenta
                  </button>
                </div>
              </form>

              {/* Active Accounts Table */}
              <div className="mt-md border border-outline-variant/30 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-surface-container-low/50 border-b border-outline-variant/30">
                    <tr>
                      <th className="p-md font-bold">Banco</th>
                      <th className="p-md font-bold">Número</th>
                      <th className="p-md font-bold">Titular</th>
                      <th className="p-md font-bold text-center w-20">Remover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {bancos.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-lg text-center text-on-surface-variant font-medium">
                          No hay cuentas bancarias registradas. Los clientes no verán opciones de transferencia.
                        </td>
                      </tr>
                    ) : (
                      bancos.map((b, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/10">
                          <td className="p-md font-bold text-primary">{b.banco}</td>
                          <td className="p-md text-on-background font-semibold">{b.numero}</td>
                          <td className="p-md text-on-surface-variant">{b.titular}</td>
                          <td className="p-md text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBanco(idx)}
                              className="text-error hover:bg-error-container/10 p-1.5 rounded-full transition-colors cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Save Banks Button */}
              <div className="flex justify-end gap-sm mt-md">
                <button
                  type="button"
                  onClick={handleSaveBancos}
                  disabled={savingBancos}
                  className="bg-primary text-on-primary text-xs font-bold py-2.5 px-6 rounded-full hover:bg-primary-container disabled:opacity-50 transition-all cursor-pointer"
                >
                  {savingBancos ? 'Guardando catálogo...' : 'Guardar Cambios de Cuenta'}
                </button>
              </div>

              {msgBancos.text && (
                <div className={`text-xs font-bold p-sm rounded-lg ${
                  msgBancos.type === 'success' ? 'bg-primary-container/20 text-primary' : 'bg-error-container/20 text-error'
                }`}>
                  {msgBancos.text}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
