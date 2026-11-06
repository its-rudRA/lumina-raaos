'use client'

import { AppShell, NAV_ITEMS } from '@/components/app-shell'

/** Initial shell route for a room whose full experience is built in a later milestone. */
export function RoomPlaceholder({ href, blurb }: { href: string; blurb: string }) {
  const item = NAV_ITEMS.find(i => i.href === href)
  const Icon = item?.icon
  return (
    <AppShell title={item?.label} subtitle={item?.subtitle}>
      <section className="mx-auto mt-6 max-w-2xl rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-8 text-center backdrop-blur-xl">
        {Icon && (
          <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-[#e6acc2]/10 text-[#edb4c5]">
            <Icon size={22} strokeWidth={1.4} />
          </span>
        )}
        <p className="eyebrow">{item?.subtitle}</p>
        <h2 className="mt-2 font-serif text-3xl text-white">{item?.label}</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">{blurb}</p>
        <p className="mt-6 text-[11px] uppercase tracking-widest text-white/30">
          This room is being prepared
        </p>
      </section>
    </AppShell>
  )
}
