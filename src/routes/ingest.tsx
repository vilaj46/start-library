import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { processOpenLibraryAuthor } from '#/lib/openlibrary/service'
import { Download, Search, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

const ingestAuthorFn = createServerFn({ method: 'POST' })
  .inputValidator((openLibraryId: string) => openLibraryId)
  .handler(async ({ data: openLibraryId }) => {
    try {
      const author = await processOpenLibraryAuthor(openLibraryId)
      return { success: true, authorId: author.id }
    } catch (e: any) {
      console.error(e)
      return { success: false, error: e.message }
    }
  })

export const Route = createFileRoute('/ingest')({
  component: IngestPage,
})

function IngestPage() {
  const [olId, setOlId] = useState('')
  const [isIngesting, setIsIngesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!olId.trim()) return

    setIsIngesting(true)
    setError(null)
    
    // Quick format check for OpenLibrary ID (usually starts with OL and ends with A)
    const formattedId = olId.trim().toUpperCase()

    const result = await ingestAuthorFn({ data: formattedId })
    
    if (result.success && result.authorId) {
      navigate({ to: `/authors/${result.authorId}` })
    } else {
      setError(result.error || 'Unknown error occurred during ingestion.')
      setIsIngesting(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <header className="mb-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)] mb-6 shadow-sm">
          <Download size={32} />
        </div>
        <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl mb-4">
          Ingest Author
        </h1>
        <p className="text-lg text-[var(--sea-ink-soft)] max-w-2xl">
          Enter an OpenLibrary Author ID to fetch their catalog. The engine will automatically summarize descriptions, filter out non-target genres, generate vector embeddings, and map works to the taxonomy.
        </p>
      </header>

      <div className="island-shell rounded-3xl p-8 sm:p-12 border border-[var(--line)] max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="olId" className="block text-sm font-bold text-[var(--sea-ink)] mb-2 uppercase tracking-wider">
              OpenLibrary Author ID
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)]" size={20} />
              <input
                id="olId"
                type="text"
                placeholder="e.g. OL23919A"
                value={olId}
                onChange={(e) => setOlId(e.target.value)}
                disabled={isIngesting}
                className="w-full bg-white border-2 border-[var(--line)] rounded-xl py-4 pl-12 pr-4 text-lg font-mono text-[var(--sea-ink)] focus:outline-none focus:border-[var(--lagoon-deep)] transition-colors disabled:opacity-50"
              />
            </div>
            <p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
              You can find this ID in the URL of an OpenLibrary author page.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isIngesting || !olId.trim()}
            className="w-full flex items-center justify-center gap-2 bg-[var(--sea-ink)] text-white py-4 rounded-xl font-bold text-lg hover:bg-[var(--lagoon-deep)] transition-all disabled:opacity-50 disabled:hover:bg-[var(--sea-ink)]"
          >
            {isIngesting ? (
              <>
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing (This takes a few minutes)...
              </>
            ) : (
              <>
                <CheckCircle2 size={24} />
                Start Ingestion
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
