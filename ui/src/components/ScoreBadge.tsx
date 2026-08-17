import { clsx } from 'clsx'

type Variant = 'sm' | 'lg'

interface ScoreColors {
  bg: string
  text: string
  ring: string
}

function scoreColors(score: number | null): ScoreColors {
  if (score === null || score < 3.5)
    return { bg: 'bg-stone-100', text: 'text-stone-600', ring: 'ring-stone-300' }
  if (score >= 4.0)
    return { bg: 'bg-emerald-50', text: 'text-emerald-800', ring: 'ring-emerald-400' }
  return { bg: 'bg-amber-50', text: 'text-amber-800', ring: 'ring-amber-400' }
}

export function ScoreBadge({ score, variant = 'sm' }: { score: number | null; variant?: Variant }) {
  const { bg, text, ring } = scoreColors(score)

  if (variant === 'lg') {
    return (
      <div className={clsx('w-16 h-16 rounded-full flex flex-col items-center justify-center ring-4', bg, ring)}>
        <span className={clsx('text-xl font-bold leading-none', text)}>
          {score === null ? '—' : score.toFixed(1)}
        </span>
        {score !== null && (
          <span className={clsx('text-xs leading-none mt-0.5 opacity-60', text)}>/5</span>
        )}
      </div>
    )
  }

  return (
    <span className={clsx('inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold ring-1', bg, text, ring)}>
      {score === null ? '—' : score.toFixed(1)}
    </span>
  )
}
