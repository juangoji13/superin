import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Super IN Delivery',
    short_name: 'Super IN',
    description: 'La mejor comida casera, a tu puerta.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fef8f3',
    theme_color: '#012d1d',
    icons: [
      {
        src: '/icon-512x512.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
