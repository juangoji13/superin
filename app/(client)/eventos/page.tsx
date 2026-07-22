'use client';

import React from 'react';
import Link from 'next/link';

export default function EventosPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-container-margin text-center">
      <div className="bg-surface-container-low p-8 md:p-12 rounded-3xl max-w-lg w-full shadow-sm border border-outline-variant/30 flex flex-col items-center">
        <div className="bg-primary/10 p-4 rounded-full mb-6">
          <span className="material-symbols-outlined text-primary text-4xl" data-icon="celebration">
            celebration
          </span>
        </div>
        
        <h1 className="font-display-md text-display-md md:text-display-lg text-on-background font-bold mb-4">
          Próximamente
        </h1>
        
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-8">
          Estamos preparando un espacio increíble para tus eventos. 
          <br /><br />
          Para cotizaciones comunicarse al:<br />
          <strong className="text-primary text-xl mt-2 inline-block">300 4870606</strong>
        </p>

        <Link
          href="/"
          className="bg-primary text-on-primary font-label-md text-label-md py-3 px-6 rounded-full hover:bg-primary-container transition-colors font-semibold"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

