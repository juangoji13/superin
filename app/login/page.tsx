'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Demo bypass state
  const [demoRole, setDemoRole] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.user) {
        // Query user role in public.usuarios
        let { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('rol, activo')
          .eq('id', data.user.id)
          .maybeSingle();

        // Si el usuario existe en Supabase Auth pero no tiene registro en public.usuarios
        if (!userData) {
          if (data.user.email === 'superinadmin@gmail.com') {
            const { data: newProfile, error: insertError } = await supabase
              .from('usuarios')
              .insert({
                id: data.user.id,
                nombre: 'Administradora Principal',
                email: data.user.email,
                rol: 'administradora',
                activo: true
              })
              .select()
              .single();

            if (insertError) {
              console.error('Error al registrar perfil de administrador:', insertError);
              throw new Error('Tu usuario no está registrado en el sistema de personal y el registro automático falló.');
            }
            userData = newProfile;
          } else {
            throw new Error('Tu usuario no está registrado en el sistema de personal.');
          }
        }

        if (!userData) {
          throw new Error('Tu usuario no está registrado en el sistema de personal.');
        }

        if (!userData.activo) {
          throw new Error('Tu usuario se encuentra inactivo.');
        }

        // Redirect based on role
        if (userData.rol === 'administradora') {
          router.push('/admin/pedidos');
        } else if (userData.rol === 'chef') {
          router.push('/cocina');
        } else if (userData.rol === 'domiciliario') {
          router.push('/reparto');
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoBypass = () => {
    if (!demoRole) return;
    // Set a session marker in localStorage to mock auth locally
    localStorage.setItem('superin_demo_role', demoRole);
    localStorage.setItem('superin_demo_user', JSON.stringify({ nombre: `Personal Demo (${demoRole})`, rol: demoRole }));

    if (demoRole === 'administradora') {
      router.push('/admin/pedidos');
    } else if (demoRole === 'chef') {
      router.push('/cocina');
    } else if (demoRole === 'domiciliario') {
      router.push('/reparto');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-md">
      <div className="max-w-md w-full bg-surface-container-lowest rounded-2xl p-lg shadow-xl border border-outline-variant/30 flex flex-col gap-lg">
        {/* Brand */}
        <div className="text-center">
          <h1 className="font-display-lg text-primary font-extrabold tracking-tight">Super IN</h1>
          <p className="font-caption text-on-surface-variant mt-1">Portal del Personal Interno</p>
        </div>

        {errorMessage && (
          <div className="bg-error-container/20 border-l-4 border-error p-md rounded-r-lg text-left text-xs text-error font-semibold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="font-label-sm text-on-surface font-semibold" htmlFor="email">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@superin.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40 text-on-surface"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="font-label-sm text-on-surface font-semibold" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none text-on-surface"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-sm bg-primary text-on-primary py-3 rounded-full font-label-sm hover:bg-primary-container transition-all shadow-md font-bold disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>

        {/* Demo Bypass Panel — ONLY in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="border-t border-outline-variant/50 pt-md mt-sm text-center flex flex-col gap-sm">
            <span className="font-caption text-on-surface-variant font-bold">
              ⚠️ Solo visible en desarrollo — Acceso Rápido de Demo
            </span>
            <div className="flex gap-sm">
              <select
                value={demoRole}
                onChange={(e) => setDemoRole(e.target.value)}
                className="flex-1 bg-surface border border-outline rounded-lg px-3 py-2 text-xs font-semibold text-on-surface"
              >
                <option value="">Selecciona Rol...</option>
                <option value="administradora">Administradora</option>
                <option value="chef">Chef (Cocina)</option>
                <option value="domiciliario">Domiciliario (Reparto)</option>
              </select>
              <button
                onClick={handleDemoBypass}
                disabled={!demoRole}
                type="button"
                className="bg-secondary-container text-on-secondary-container text-xs font-bold px-lg py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              >
                Entrar como Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
