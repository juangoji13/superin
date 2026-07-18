'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Next.js
const createCustomIcon = (iconUrl: string) => {
  return new L.Icon({
    iconUrl,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
};

const restaurantIcon = createCustomIcon('https://cdn-icons-png.flaticon.com/512/3448/3448651.png');
const deliveryIcon = createCustomIcon('https://cdn-icons-png.flaticon.com/512/7542/7542177.png');

interface DeliveryMapProps {
  status: string;
}

// Mock locations for demo purposes (e.g. Bogota)
const RESTAURANT_LOC: [number, number] = [4.6097, -74.0817];
const CLIENT_LOC: [number, number] = [4.6200, -74.0700];

// Helper to center map
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  map.setView(center, map.getZoom());
  return null;
}

export default function DeliveryMap({ status }: DeliveryMapProps) {
  const [driverPos, setDriverPos] = useState<[number, number]>(RESTAURANT_LOC);

  useEffect(() => {
    // Only animate if status is 'En camino'
    if (status !== 'En camino') {
      return;
    }

    // Simple animation logic from restaurant to client
    let step = 0;
    const totalSteps = 100;
    
    const interval = setInterval(() => {
      step++;
      const lat = RESTAURANT_LOC[0] + (CLIENT_LOC[0] - RESTAURANT_LOC[0]) * (step / totalSteps);
      const lng = RESTAURANT_LOC[1] + (CLIENT_LOC[1] - RESTAURANT_LOC[1]) * (step / totalSteps);
      
      setDriverPos([lat, lng]);

      if (step >= totalSteps) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [status]);

  return (
    <div className="w-full h-[300px] md:h-[400px] rounded-2xl overflow-hidden border border-outline-variant/70 shadow-sm relative z-0">
      <MapContainer 
        center={status === 'En camino' ? driverPos : RESTAURANT_LOC} 
        zoom={14} 
        scrollWheelZoom={false} 
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <ChangeView center={status === 'En camino' ? driverPos : RESTAURANT_LOC} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        <Marker position={RESTAURANT_LOC} icon={restaurantIcon}>
          <Popup>Restaurante Super IN</Popup>
        </Marker>

        {status === 'En camino' && (
          <Marker position={driverPos} icon={deliveryIcon}>
            <Popup>Repartidor en camino</Popup>
          </Marker>
        )}

        {status === 'Entregado' && (
          <Marker position={CLIENT_LOC} icon={deliveryIcon}>
            <Popup>¡Entregado!</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
