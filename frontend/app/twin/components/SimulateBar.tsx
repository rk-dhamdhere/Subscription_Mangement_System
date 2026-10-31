'use client'

import { memo, useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'

type SimulateBarProps = {
  onSimulate: () => void
}

const presets = [
  { label: 'Price +8%', prompt: 'What if we raise prices by 8%?' },
  { label: 'Paid ads −30%', prompt: 'What if we cut paid ads by 30%?' },
  { label: 'Hire 10 people', prompt: 'What if we hire 10 people?' },
]

function SimulateBar({ onSimulate }: SimulateBarProps) {
  const [prompt, setPrompt] = useState('What if we raise prices by 15%?')

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSimulate()
  }

  function choosePreset(value: string) {
    setPrompt(value)
    onSimulate()
  }

  return (
    <div className="relative z-20 mx-auto w-full max-w-[650px]">
      <form
        id="simulate"
        onSubmit={submit}
        className="flex w-full items-center gap-2 rounded-full border border-white/[0.12] bg-[#101412]/90 p-1.5 shadow-[0_12px_60px_rgba(0,0,0,0.28)] backdrop-blur-md"
      >
        <label htmlFor="decision-prompt" className="sr-only">
          Describe a business decision to simulate
        </label>
        <input
          id="decision-prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          type="submit"
          className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#22C55E] px-4 text-xs font-semibold text-[#07120d] transition-colors hover:bg-[#86EFAC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86EFAC] active:scale-[0.97] sm:px-5"
        >
          Simulate
          <ArrowRight
            aria-hidden="true"
            className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap justify-center gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => choosePreset(preset.prompt)}
            className="rounded-full border border-white/[0.1] bg-[#101412]/75 px-3 py-1.5 text-[10px] font-medium text-white/55 transition-colors hover:border-[#22C55E]/35 hover:text-[#86EFAC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#86EFAC] sm:text-[11px]"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default memo(SimulateBar)
