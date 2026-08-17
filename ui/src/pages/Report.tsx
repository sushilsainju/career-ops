import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ExternalLink, FileText, PenLine, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { parseReport, type Report as ReportType } from '@/lib/parsers/report'
import { ScoreBadge } from '@/components/ScoreBadge'

const BLOCK_LABELS: Record<string, string> = {
  A: 'Role Summary', B: 'CV Match', C: 'Level & Strategy',
  D: 'Comp & Demand', E: 'CV Personalization', F: 'Interview Prep', G: 'Legitimacy',
}
const BLOCK_KEYS = Object.keys(BLOCK_LABELS)

interface NavItem { id: string; company: string }

function slugToCompany(f: string): string {
  const s = f.split('-')[1] ?? ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function useActiveSection(keys: string[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    keys.forEach(key => {
      const el = document.getElementById(`block-${key}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActive(key) },
        { rootMargin: '-10% 0% -80% 0%', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [keys])
  return active
}

function LegitimacyBadge({ text }: { text: string }) {
  if (!text) return null
  if (text.includes('High Confidence'))
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">High Confidence</span>
  if (text.includes('Caution'))
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Caution</span>
  if (text.includes('Suspicious'))
    return <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Suspicious</span>
  return <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200">{text}</span>
}

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl flex gap-8 animate-pulse">
      <div className="flex-1 min-w-0">
        <div className="h-3 w-20 bg-stone-100 rounded mb-6" />
        <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-stone-100">
          <div className="flex-1 space-y-2">
            <div className="h-6 w-48 bg-stone-200 rounded" />
            <div className="h-4 w-36 bg-stone-100 rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-4 w-16 bg-stone-100 rounded-full" />
              <div className="h-4 w-20 bg-stone-100 rounded-full" />
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-stone-200 shrink-0" />
        </div>
        <div className="space-y-3">
          <div className="h-3 w-full bg-stone-100 rounded" />
          <div className="h-3 w-4/5 bg-stone-100 rounded" />
          <div className="h-3 w-2/3 bg-stone-100 rounded" />
        </div>
      </div>
      <div className="w-44 shrink-0">
        <div className="h-3 w-16 bg-stone-100 rounded mb-4" />
        <div className="space-y-2">
          {BLOCK_KEYS.map(k => <div key={k} className="h-8 bg-stone-100 rounded-md" />)}
        </div>
      </div>
    </div>
  )
}

export function Report() {
  const { id } = useParams<{ id: string }>()
  const [report, setReport] = useState<ReportType | null>(null)
  const [filename, setFilename] = useState<string>('')
  const [allFiles, setAllFiles] = useState<string[]>([])
  const [coverCopied, setCoverCopied] = useState(false)
  const activeSection = useActiveSection(BLOCK_KEYS)

  useEffect(() => {
    if (!id) return
    api.report(id).then(({ content, filename: f }) => {
      setReport(parseReport(id, content))
      setFilename(f)
    })
    api.reports().then(({ files }) => setAllFiles([...files].reverse()))
  }, [id])

  const navItems = useMemo<NavItem[]>(
    () => allFiles.map(f => ({ id: f.split('-')[0], company: slugToCompany(f) })),
    [allFiles]
  )

  const copyCoverLetter = useCallback(() => {
    if (!report) return
    const lines = [
      `/career-ops pdf`, ``,
      `Generate a one-page tailored cover letter for ${report.company} — ${report.role}.`,
      filename ? `Report: reports/${filename}` : null,
      report.jobUrl ? `Job URL: ${report.jobUrl}` : null, ``,
      `Requirements: same visual design as the CV. JD quotes mapped to proof points. Lead with the company problem, not "I am applying." No clichés. 1 page max.`,
    ].filter((l): l is string => l !== null)
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCoverCopied(true)
      setTimeout(() => setCoverCopied(false), 2500)
    })
  }, [report, filename])

  if (!report) return <LoadingSkeleton />

  const idx = navItems.findIndex(n => n.id === id)
  const prev = navItems[idx + 1] ?? null
  const next = navItems[idx - 1] ?? null
  const hasPdf = typeof report.pdfPath === 'string' &&
    report.pdfPath.endsWith('.pdf') && report.pdfPath.startsWith('output/')

  return (
    <div className="max-w-5xl flex gap-8">
      <div className="flex-1 min-w-0">
        <Link to="/reports" className="inline-flex items-center gap-0.5 text-xs text-stone-400 hover:text-stone-600 transition-colors mb-4">
          <ChevronLeft size={13} />All Reports
        </Link>

        <div className="flex items-start justify-between gap-4 border-b border-stone-100 mb-6 pb-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-stone-900 leading-tight">{report.company}</h1>
            <p className="text-stone-500 mt-1 text-sm">{report.role}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-stone-400">{report.date}</span>
              {report.archetype && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">{report.archetype}</span>
              )}
              <LegitimacyBadge text={report.legitimacy} />
            </div>
          </div>
          <div className="shrink-0"><ScoreBadge score={report.score} variant="lg" /></div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5 pb-5 border-b border-stone-100">
          {report.jobUrl && (
            <a href={report.jobUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-600">
              <ExternalLink size={12} />Job Posting
            </a>
          )}
          {hasPdf && (
            <a href={`/api/file?path=${encodeURIComponent(report.pdfPath!)}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-stone-900 text-white rounded-md hover:bg-stone-700 transition-colors">
              <FileText size={12} />View CV
            </a>
          )}
          <button onClick={copyCoverLetter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-600"
            title="Copy prompt — paste in Claude Code to generate a cover letter">
            {coverCopied ? <Check size={12} className="text-emerald-600" /> : <PenLine size={12} />}
            {coverCopied ? 'Prompt copied!' : 'Cover Letter'}
          </button>
        </div>

        <div className="flex justify-between text-xs text-stone-500 mb-6">
          {prev
            ? <Link to={`/reports/${prev.id}`} className="flex items-center gap-0.5 hover:text-stone-800 transition-colors"><ChevronLeft size={13} />{prev.company}</Link>
            : <span />}
          {next
            ? <Link to={`/reports/${next.id}`} className="flex items-center gap-0.5 hover:text-stone-800 transition-colors">{next.company}<ChevronRight size={13} /></Link>
            : <span />}
        </div>

        <div className="prose prose-stone prose-sm max-w-none prose-headings:font-semibold prose-h3:text-sm prose-h3:mt-4 prose-table:text-xs prose-td:py-1.5 prose-th:py-1.5 prose-code:text-xs prose-code:bg-stone-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h2: ({ children }) => {
                const text = typeof children === 'string' ? children
                  : Array.isArray(children) ? children.filter(c => typeof c === 'string').join('') : ''
                const match = /^([A-G])\)/.exec(text)
                return (
                  <h2 id={match ? `block-${match[1]}` : undefined}
                    className="flex items-center gap-2 text-sm font-bold text-stone-700 mt-8 mb-3 pb-2 border-b border-stone-100">
                    {children}
                  </h2>
                )
              },
            }}
          >
            {report.bodyContent}
          </ReactMarkdown>
        </div>
      </div>

      <div className="w-44 shrink-0">
        <div className="sticky top-6">
          <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Sections</div>
          <div className="space-y-1.5">
            {BLOCK_KEYS.map(key => report.sections[key] ? (
              <a key={key} href={`#block-${key}`}
                className={`flex items-center gap-1.5 rounded-md p-2.5 border transition-all ${activeSection === key ? 'bg-stone-100 border-stone-400' : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-xs'}`}>
                <span className={`text-xs font-bold w-4 shrink-0 ${activeSection === key ? 'text-stone-700' : 'text-stone-400'}`}>{key}</span>
                <span className={`text-xs leading-tight ${activeSection === key ? 'font-semibold text-stone-800' : 'text-stone-600'}`}>{BLOCK_LABELS[key]}</span>
              </a>
            ) : null)}
          </div>

          <div className="mt-6 space-y-1.5">
            <div className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">Actions</div>
            {hasPdf && (
              <a href={`/api/file?path=${encodeURIComponent(report.pdfPath!)}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 w-full px-2.5 py-2 text-xs border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-600">
                <FileText size={11} />View CV
              </a>
            )}
            <button onClick={copyCoverLetter}
              className="flex items-center gap-1.5 w-full px-2.5 py-2 text-xs border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-600">
              {coverCopied ? <Check size={11} className="text-emerald-600" /> : <PenLine size={11} />}
              {coverCopied ? 'Copied!' : 'Cover Letter'}
            </button>
            {report.jobUrl && (
              <a href={report.jobUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 w-full px-2.5 py-2 text-xs border border-stone-200 rounded-md hover:bg-stone-50 transition-colors text-stone-600">
                <ExternalLink size={11} />Job Posting
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
