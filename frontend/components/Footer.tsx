import { ArrowUpRight, Network } from 'lucide-react'

const productLinks = [
  ['Product', '#product'],
  ['Simulate', '#simulate'],
  ['Compare', '#compare'],
  ['Intelligence', '#intelligence'],
  ['Memory', '#memory'],
] as const

const accountLinks = [
  ['Twin experience', '/twin'],
  ['Sign in', '/login'],
] as const

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#070807] px-5 py-14 sm:px-8 sm:py-16 lg:py-20">
      <div className="mx-auto grid max-w-[1440px] gap-12 md:grid-cols-[minmax(0,1.15fr)_minmax(180px,0.5fr)_minmax(180px,0.5fr)] md:gap-10 lg:gap-16">
        <div className="flex flex-col items-start gap-4">
          <a
            href="#top"
            className="flex items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
            aria-label="Twin home"
          >
            <span className="grid size-9 place-items-center rounded-xl border border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-300">
              <Network aria-hidden="true" className="size-[18px]" />
            </span>
            <span className="text-xl font-semibold tracking-[-0.06em] text-white">
              Twin
            </span>
          </a>
          <p className="max-w-[260px] text-sm leading-6 text-neutral-500">
            See what&apos;s next with Twin.
          </p>
        </div>

        <nav aria-label="Product links">
          <h2 className="mb-5 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Explore
          </h2>
          <ul className="space-y-3.5">
            {productLinks.map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  className="text-sm text-neutral-400 transition-colors duration-200 hover:text-emerald-300 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Account links">
          <h2 className="mb-5 text-[10px] font-medium uppercase tracking-[0.18em] text-neutral-500">
            Account
          </h2>
          <ul className="space-y-3.5">
            {accountLinks.map(([label, href]) => (
              <li key={label}>
                <a
                  href={href}
                  className="text-sm text-neutral-400 transition-colors duration-200 hover:text-emerald-300 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto mt-12 flex max-w-[1440px] items-center justify-between border-t border-white/[0.06] pt-5">
        <p className="text-[11px] text-neutral-600">Twin</p>
        <a
          href="#top"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 transition-colors duration-200 hover:text-emerald-300 focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-300"
        >
          Back to top <ArrowUpRight aria-hidden="true" className="size-3.5" />
        </a>
      </div>
    </footer>
  )
}
