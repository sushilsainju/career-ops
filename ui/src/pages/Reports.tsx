import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { FileText, ExternalLink, PenLine, Check } from 'lucide-react'
import { clsx } from 'clsx'
import { api } from '@/lib/api'
import { parseReport } from '@/lib/parsers/report'
import { ScoreBadge } from '@/components/ScoreBadge'

interface ReportSummary {
  id: string
  filename: string
  company: string
  role: string
  score: number | null
  date: string
  archetype: string
  legitimacy: string
  jobUrl: string | null
  pdfPath: string | null
}

type SortMode = 'newest' | 'top'

const scoreBorder = (s: number | null, h: boolean) => {
  if (s === null) return h ? 'border-l-stone-300' : 'border-l-stone-200'
  if (s >= 4.0) return h ? 'border-l-emerald-500' : 'border-l-emerald-400'
  if (s >= 3.5) return h ? 'border-l-amber-500' : 'border-l-amber-400'
  return h ? 'border-l-stone-400' : 'border-l-stone-300'
}

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (dt.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return dt.toLocaleDateString('en-US', opts)
}

function LegitimacyChip({ text }: { text: string }) {
  if (!text) return null
  if (text.includes('High Confidence'))
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">⚡ High Confidence</span>
  if (text.includes('Caution'))
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">⚠ Caution</span>
  if (text.includes('Suspicious'))
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">🚩 Suspicious</span>
  return null
}

function CoverLetterBtn({ report }: { report: ReportSummary }) {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const prompt = [
      `/career-ops pdf`, ``,
      `Generate a one-page tailored cover letter for ${report.company} — ${report.role}.`,
      `Report: reports/${report.filename}`,
      report.jobUrl ? `Job URL: ${report.jobUrl}` : null, ``,
      `Requirements: same visual design as the CV. JD quotes mapped to proof points. Lead with the company problem, not "I am applying." No clichés. 1 page max.`,
    ].filter(l => l !== null).join('\n')
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }, [report])
  return (
    <button onClick={copy} className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-600">
      {copied ? <Check size={12} className="text-emerald-600" /> : <PenLine size={12} />}
      {copied ? 'Copied!' : 'Cover Letter'}
    </button>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-stone-200 border-l-4 border-l-stone-200 rounded-lg overflow-hidden px-5 py-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="shrink-0 flex flex-col items-center gap-1.5 pt-0.5 w-14">
          <div className="w-9 h-6 rounded-md bg-stone-100" />
          <div className="w-6 h-2.5 rounded bg-stone-100" />
        </div>
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5 flex-1">
              <div className="h-4 w-36 rounded bg-stone-100" />
              <div className="h-3.5 w-52 rounded bg-stone-100" />
            </div>
            <div className="h-3 w-12 rounded bg-stone-100 shrink-0" />
          </div>
          <div className="flex gap-1.5">
            <div className="h-5 w-20 rounded-full bg-stone-100" />
            <div className="h-5 w-24 rounded-full bg-stone-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-6 w-24 rounded-md bg-stone-100" />
            <div className="h-6 w-20 rounded-md bg-stone-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportCard({ r }: { r: ReportSummary }) {
  const [hovered, setHovered] = useState(false)
  const hasPdf = typeof r.pdfPath === 'string' && r.pdfPath.endsWith('.pdf') && r.pdfPath.startsWith('output/')
  const archLabel = r.archetype ? r.archetype.split(' (')[0] : ''
  const truncArch = archLabel.length > 30 ? archLabel.slice(0, 30) + '…' : archLabel

  return (
    <article
      className={clsx('relative bg-white border border-stone-200 border-l-4 rounded-lg overflow-hidden cursor-pointer transition-all duration-150', scoreBorder(r.score, hovered), hovered && '-translate-y-px shadow-md')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/reports/${r.id}`} className="absolute inset-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-1" aria-label={`View report for ${r.company} — ${r.role}`} />
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          <div className="shrink-0 flex flex-col items-center gap-1 pt-0.5 w-14">
            <ScoreBadge score={r.score} />
            <span className="text-[10px] text-stone-300 font-mono">#{r.id}</span>
            {r.score !== null && r.score >= 4.0 && (
              <span className="text-[10px] text-emerald-600 font-medium">Apply →</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-semibold text-stone-900 leading-tight truncate">{r.company}</h2>
                <p className="text-sm text-stone-500 mt-0.5 truncate">{r.role}</p>
              </div>
              <span className="text-xs text-stone-300 shrink-0 mt-0.5">{fmtDate(r.date)}</span>
            </div>
            {(r.archetype || r.legitimacy) && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {truncArch && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{truncArch}</span>
                )}
                <LegitimacyChip text={r.legitimacy} />
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <Link to={`/reports/${r.id}`} className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-900 text-white rounded-md hover:bg-stone-700 transition-colors">
                <FileText size={12} />
                View Report
              </Link>
              {hasPdf && (
                <a href={`/api/file?path=${encodeURIComponent(r.pdfPath!)}`} target="_blank" rel="noopener noreferrer" className="relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-600">
                  <ExternalLink size={12} />
                  View CV
                </a>
              )}
              <CoverLetterBtn report={r} />
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

export function Reports() {
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortMode>('newest')

  useEffect(() => {
    api.reports().then(async ({ files }) => {
      const summaries = await Promise.all(
        files.map(async filename => {
          const id = filename.split('-')[0]
          const { content } = await api.report(id)
          const r = parseReport(id, content)
          return { id, filename, company: r.company, role: r.role, score: r.score, date: r.date, archetype: r.archetype, legitimacy: r.legitimacy, jobUrl: r.jobUrl, pdfPath: r.pdfPath }
        })
      )
      setReports(summaries)
      setLoading(false)
    })
  }, [])

  const sorted = useMemo(() => {
    if (sort === 'top') return [...reports].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    return [...reports].sort((a, b) => b.date.localeCompare(a.date))
  }, [reports, sort])

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-900">
          Reports
          {!loading && <span className="ml-2 text-sm font-normal text-stone-400 align-middle">({reports.length})</span>}
        </h1>
        {!loading && reports.length > 1 && (
          <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
            {(['newest', 'top'] as const).map(m => (
              <button key={m} onClick={() => setSort(m)} className={clsx('px-3 py-1 text-xs rounded-md font-medium transition-colors', sort === m ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700')}>
                {m === 'newest' ? 'Newest' : 'Top Score'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        {!loading && sorted.map(r => <ReportCard key={r.id} r={r} />)}
        {!loading && reports.length === 0 && (
          <div className="py-14 text-center text-sm text-stone-400 bg-white border border-dashed border-stone-300 rounded-lg">
            <p className="font-medium text-stone-500 mb-1">No reports yet</p>
            <p>Run <code className="text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">/career-ops</code> with a job URL to evaluate your first offer.</p>
          </div>
        )}
      </div>
    </div>
  )
}
