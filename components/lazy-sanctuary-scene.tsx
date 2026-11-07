'use client'

import dynamic from 'next/dynamic'

/** Three.js is loaded lazily on the client so routes render instantly. */
export const LazySanctuaryScene = dynamic(
  () => import('@/components/sanctuary-scene').then(m => m.SanctuaryScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 grid place-items-center bg-[#0a0914]" role="status" aria-label="Loading 3D garden">
        <div className="lumina-orb" aria-hidden />
      </div>
    ),
  }
)
