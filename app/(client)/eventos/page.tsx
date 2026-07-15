'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function EventosPage() {
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [tipoEvento, setTipoEvento] = useState('');
  const [fecha, setFecha] = useState('');
  const [invitados, setInvitados] = useState('');
  const [horario, setHorario] = useState('Día');
  const [mensaje, setMensaje] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [whatsappContact, setWhatsappContact] = useState('573001234567');

  useEffect(() => {
    async function fetchWhatsapp() {
      try {
        const { data } = await supabase
          .from('configuracion')
          .select('valor')
          .eq('clave', 'whatsapp_contacto')
          .single();
        if (data?.valor && typeof data.valor === 'object' && 'numero' in data.valor) {
          setWhatsappContact((data.valor as any).numero || '573001234567');
        }
      } catch (err) {
        console.error('Failed to load support phone', err);
      }
    }
    fetchWhatsapp();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !celular.trim() || !tipoEvento || !fecha || !invitados) {
      alert('Por favor completa todos los campos obligatorios.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Insert into database
      const { error } = await supabase
        .from('cotizaciones')
        .insert({
          cliente: nombre,
          celular: celular,
          tipo_evento: tipoEvento,
          fecha: fecha,
          invitados: parseInt(invitados, 10),
          horario: horario,
          servicios: ['catering'], // Default service
          mensaje: mensaje,
          estado: 'Pendiente'
        });

      if (error) {
        throw new Error(`Error guardando cotización: ${error.message}`);
      }

      // 2. Prefill WhatsApp message
      const messageText = `Hola Super IN, solicité una cotización desde la página web para un evento.

Nombre: ${nombre}
Celular: ${celular}
Tipo de Evento: ${tipoEvento}
Fecha: ${fecha}
Invitados: ${invitados}
Horario: ${horario}
Mensaje: ${mensaje || 'Sin requerimientos especiales'}`;

      const whatsappUrl = `https://wa.me/${whatsappContact}?text=${encodeURIComponent(messageText)}`;

      // 3. Clear form and alert
      setNombre('');
      setCelular('');
      setTipoEvento('');
      setFecha('');
      setInvitados('');
      setHorario('Día');
      setMensaje('');

      alert('¡Tu solicitud ha sido registrada! Te redirigiremos a WhatsApp para continuar con la cotización.');
      window.open(whatsappUrl, '_blank');
    } catch (err: any) {
      alert(`Error al registrar cotización: ${err.message || err}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col pb-24 md:pb-12">
      {/* Mobile Context Header */}
      <div className="flex items-center gap-sm md:hidden px-container-margin py-3 border-b border-outline-variant/30">
        <Link href="/" className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors">
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
        <span className="font-title-md text-title-md text-primary font-bold">Eventos</span>
      </div>

      {/* Hero Section */}
      <section className="relative h-[480px] md:h-[550px] w-full flex items-end justify-center pb-12 px-container-margin">
        <div className="absolute inset-0 bg-black/40 z-10"></div>
        <img
          alt="Salón de eventos decorado"
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCEpe5JRmjcAUXbyWb8iyJ1tCE7VPpysQfWWOfQH0EPUuVFOTg44Vn6mMwL251BAhPC2nALCY_awSow2zvwj3gfUKSykNdBPoohWfREoCPcqYue_CwZPkOhDx1ipkBIhWcHsJql_M65XHyxkusF00ohH9MsV75RpY7shJWoR20zLWMK4mFPJPxxp-0AsxSfnT9b7QGsiE5tvnbzdkBCnVeSz7ItqUeqoJ5dGDIZ4YUGmfseSCdExz-6kI-C00JuHENGQ59274O3W74"
        />
        <div className="relative z-20 text-center w-full max-w-2xl px-md">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-white mb-4 shadow-sm font-bold">
            Celebra tus mejores momentos con Super IN Eventos
          </h1>
          <p className="font-body-md text-body-md text-white/90">
            Espacios elegantes y banquetería premium para ocasiones inolvidables en Barranquilla.
          </p>
        </div>
      </section>

      {/* Tipos de Eventos (Horizontal Scroll/Grid) */}
      <section className="py-xl px-container-margin md:px-xl max-w-7xl mx-auto w-full">
        <h2 className="font-title-md text-title-md text-on-surface mb-md font-bold">Nuestros Servicios</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {/* Card 1 */}
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="h-48 w-full relative">
              <img
                alt="Cumpleaños"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuB67y9pKtxiwpuWGp8wXb0ig4HxQfDITNUK0jeHK7uo8oVCEAzAxv7AIa7Zcqw1AnlB_oTNvYWWjXouf34YylCKecxjzFEg8E9chSfEmZx3GmM0tIVN5HxCRAvxyzXstlfFKtvLpQpkZBj0SpPkX6y5S12zaTnp3PPa7bg9Jwg2e5OqHogeJcI2DmDr3fUOx4JP81GmSPTYjqbG_QZGkq2T8kW692umyPS8ZJ4pI1U7ubwa-Bi_re4KEoygdfCChH6CdKFKd30WSiI"
              />
            </div>
            <div className="p-md flex-grow">
              <h3 className="font-title-md text-title-md text-on-surface mb-xs font-bold">Cumpleaños</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Paquetes completos para celebrar tu día especial con familia y amigos, incluyendo decoración y pasabocas.
              </p>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="h-48 w-full relative">
              <img
                alt="Bodas"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDnakr8Z96laNQh-LZ733DzOyX-y3UUhQFICfUdarOfl5NgtAyOq1diVDDNGLPoVciuKdtRjNnHdN5iiz2GBSia_o7YMshAM5n3aQ2HID8AWoC2KWwLCNB0VffkD4iFWrftxwHVxrliJGu-3yGeTyr3dYafCYVCWLBAm8XldbHuejpWFbEBaWkbiK127G6FUSNOquqBjGcLxK8oUR8DQaorQvmlrvnnCJNdgHWB0bwuaSlil5_5UHPWCCL5VcrwurazaqmzfmE1TPk"
              />
            </div>
            <div className="p-md flex-grow">
              <h3 className="font-title-md text-title-md text-on-surface mb-xs font-bold">Bodas</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Banquetería de primera clase, sonido profesional y ambientación romántica para hacer de tu boda un recuerdo inolvidable.
              </p>
            </div>
          </div>
          
          {/* Card 3 */}
          <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 flex flex-col">
            <div className="h-48 w-full relative">
              <img
                alt="Corporativos"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDXIYsLr2rBusM7bR7EF2i41y5ljAYhxJHfzayH47G_LCEuw7IKp4MzD4wqpI9-8C3T2rIxXwyWhKFYiXry15-m98g4aVWcv5IRVeF-OXN1ZfrisQnptET6uZtYSbP674jR35hWQfOUpmUI4HLu7O1hLAzfG95NnZFoDn6kLwn90kTNIlOvYxRicF0mOcCBC4hH7VN4TCHmxHymrQyYiv87NyE7Ze5-c3Qv4RvdkaK47D_oNSKq0aoFyUa_4sLL4Th6TvMIizxvlS4"
              />
            </div>
            <div className="p-md flex-grow">
              <h3 className="font-title-md text-title-md text-on-surface mb-xs font-bold">Corporativos</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Coffee breaks ejecutivos, almuerzos de negocios y fiestas de fin de año empresariales adaptados a tus requerimientos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Galería Bento Grid */}
      <section className="py-xl px-container-margin md:px-xl bg-surface-container-low w-full">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-title-md text-title-md text-on-surface mb-md font-bold">Galería del Salón</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <div className="md:col-span-2 md:row-span-2 rounded-2xl overflow-hidden h-[300px] md:h-[420px] relative">
              <img
                alt="Salón principal"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBO96pcwjEE7L96Hhg2rwXIDkr_R44HplJbxcvBR24hhAMO5Dwu_MSJ2upz6NGTvJ-ygUvv0FfqcPq39Ltd3HAoGoIRnStWhQKGh4mLnUbmLq1hSaK1F27WXJ6c_7oKIpEVYZTTe4Qg4cSppd2urLWTeh2cb-5EdvKLPJgotaz5856T4TEVguxsqkoC964AkQ91bB-7UYsu-SQjQ4u0HEp6DduqTVx1EShEW_F886qlezWhNr0zbbjus_3jKK8Fm8JXa5yh-ineR7Q"
              />
            </div>
            <div className="rounded-2xl overflow-hidden h-[200px] relative">
              <img
                alt="Platillo elegante"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJnnA7oPmKi4iRESOXy2LPoLw2eMS0CXphyrijMI6VtD1NIlM1ohhxmt3yvIu9uUICohKw9XdoHhc2LHK1I3afl5KUY1h3twOuB4jS0t38_E9tHng6Jsh32Ud7wHtZWKZCQuyaNq4XgLRmuhuIJ7q-FIV6hss7rwLu4NBp-JHSYtBvB8uT0zdXv2jbJ7_vBeNN43HNfk8c35NeCD3q6fjRZnyKKTRSHo9hz9lvPwtGVD1hquufxFD8KZF-BIiQevg3llRMlpvOJhU"
              />
            </div>
            <div className="rounded-2xl overflow-hidden h-[200px] relative">
              <img
                alt="Decoración floral"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBdtvYnyKOQ4KarK-F37Q-6wYtbo_vcSBZUHbxhPHZ9vOOrwhbpd6GrMzZR92loynAWP6Hx_xvg_5T2giTCz1Zj9n-1b5ZidCFNmTKOtvDSQg1b616Gv7rqABuVY2PWjOxLb4T_RFcW7K0426CSX1YY5b1CGwGAbR9bSoC-d4yk2CCkYxWC470muH3ri5WPb_zbLxEHcIdbQm1JgCZo7XmhxVOA3GaPCLusUmBuqf_OWFeV5Y01eIJta63egl4v-2lIjQhAg-u7zM8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Formulario de Cotización */}
      <section className="py-xl px-container-margin md:px-xl max-w-3xl mx-auto w-full">
        <h2 className="font-title-md text-title-md text-on-surface mb-xs font-bold">Cotiza tu Evento</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-lg">
          Déjanos tus datos y te contactaremos para organizar cada detalle de tu celebración.
        </p>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-md bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant/30 shadow-sm">
          <div className="flex flex-col gap-xs">
            <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="nombre">
              Nombre completo <span className="text-error">*</span>
            </label>
            <input
              required
              id="nombre"
              type="text"
              placeholder="Ej: María Gómez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40"
            />
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="celular">
              Celular <span className="text-error">*</span>
            </label>
            <input
              required
              id="celular"
              type="tel"
              placeholder="+57 300 000 0000"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40"
            />
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="tipo_evento">
              Tipo de evento <span className="text-error">*</span>
            </label>
            <select
              required
              id="tipo_evento"
              value={tipoEvento}
              onChange={(e) => setTipoEvento(e.target.value)}
              className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none text-on-surface"
            >
              <option value="" disabled>Selecciona una opción</option>
              <option value="Cumpleaños">Cumpleaños</option>
              <option value="Boda">Boda</option>
              <option value="Corporativo">Corporativo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md">
            <div className="flex flex-col gap-xs sm:col-span-1">
              <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="fecha">
                Fecha estimada <span className="text-error">*</span>
              </label>
              <input
                required
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none text-on-surface"
              />
            </div>
            
            <div className="flex flex-col gap-xs sm:col-span-1">
              <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="invitados">
                Nº Invitados <span className="text-error">*</span>
              </label>
              <input
                required
                id="invitados"
                type="number"
                placeholder="Ej: 50"
                value={invitados}
                onChange={(e) => setInvitados(e.target.value)}
                className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none placeholder:text-on-surface-variant/40"
              />
            </div>

            <div className="flex flex-col gap-xs sm:col-span-1">
              <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="horario">
                Horario <span className="text-error">*</span>
              </label>
              <select
                id="horario"
                value={horario}
                onChange={(e) => setHorario(e.target.value)}
                className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none text-on-surface"
              >
                <option value="Día">Día</option>
                <option value="Tarde">Tarde</option>
                <option value="Noche">Noche</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-xs">
            <label className="font-label-sm text-label-sm text-on-surface font-semibold" htmlFor="mensaje">
              Mensaje o requerimientos especiales
            </label>
            <textarea
              id="mensaje"
              rows={3}
              placeholder="Cuéntanos más sobre lo que imaginas para tu evento..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              className="w-full bg-surface border border-outline rounded-lg px-4 py-3 font-body-md focus:border-primary focus:outline-none resize-none placeholder:text-on-surface-variant/40"
            ></textarea>
          </div>
          
          <button
            disabled={submitting}
            type="submit"
            className="w-full mt-lg bg-primary text-on-primary font-label-sm text-label-sm py-4 rounded-full flex items-center justify-center gap-2 hover:bg-primary-container active:scale-[0.98] transition-all shadow-md font-bold disabled:opacity-50 cursor-pointer"
          >
            <span className="material-symbols-outlined">chat</span>
            {submitting ? 'Registrando cotización...' : 'Solicitar cotización por WhatsApp'}
          </button>
        </form>
      </section>
    </div>
  );
}
