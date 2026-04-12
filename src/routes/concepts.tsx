import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Beaker, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export const Route = createFileRoute('/concepts')({
  component: ConceptsPage,
})

function ConceptsPage() {
  const [response, setResponse] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePost = async () => {
    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const res = await fetch('/api/concepts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'New Concept',
          timestamp: new Date().toISOString(),
          description: 'A concept created from the UI',
        }),
      })

      if (!res.ok) {
        throw new Error(`Failed to send request: ${res.statusText}`)
      }

      const data = await res.json()
      setResponse(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="island-shell rise-in relative overflow-hidden rounded-3xl p-8 sm:p-12 shadow-[0_20px_50px_rgba(30,90,72,0.1)] border border-[var(--line)]">
        {/* Decorative background elements */}
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.2),transparent_70%)]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(47,106,74,0.1),transparent_70%)]" />

        <div className="relative z-10">
          <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)] shadow-inner">
            <Beaker size={24} />
          </div>

          <p className="island-kicker mb-3">API Interaction</p>
          <h1 className="display-title mb-4 text-4xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-5xl">
            Concept Lab
          </h1>
          <p className="mb-10 max-w-2xl text-lg leading-relaxed text-[var(--sea-ink-soft)]">
            Test the concepts API by sending a POST request. This action will trigger a server-side handler and return the processed data.
          </p>

          <div className="flex flex-col gap-6">
            <button
              onClick={handlePost}
              disabled={isLoading}
              className={`
                group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl px-8 py-4 text-lg font-bold transition-all duration-300 sm:w-max
                ${isLoading
                  ? 'cursor-not-allowed bg-[var(--sea-ink-soft)] opacity-70'
                  : 'bg-[var(--lagoon-deep)] text-white hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(30,90,72,0.3)] active:translate-y-0'
                }
              `}
              type="button"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 -translate-x-full group-hover:translate-x-full" />

              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              )}

              <span>{isLoading ? 'Processing...' : 'Send POST Request'}</span>
            </button>

            {/* Response Section */}
            {(response || error) && (
              <div className={`mt-4 overflow-hidden rounded-2xl border p-6 transition-all duration-500 animate-in fade-in slide-in-from-top-4 ${error
                ? 'border-red-200 bg-red-50/50 text-red-900'
                : 'border-[var(--lagoon-soft)] bg-[var(--lagoon-soft)]/20 text-[var(--sea-ink)]'
                }`}>
                <div className="mb-4 flex items-center gap-3">
                  {error ? (
                    <AlertCircle className="text-red-600" size={20} />
                  ) : (
                    <CheckCircle2 className="text-[var(--lagoon-deep)]" size={20} />
                  )}
                  <h3 className="font-bold uppercase tracking-wider text-xs">
                    {error ? 'Request Failed' : 'Server Response'}
                  </h3>
                </div>

                {error ? (
                  <p className="text-sm">{error}</p>
                ) : (
                  <div className="rounded-xl border border-[var(--line)] bg-white/40 p-4 backdrop-blur-sm">
                    <pre className="overflow-x-auto text-sm font-mono leading-relaxed">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="island-shell rounded-2xl p-6 border border-[var(--line)] bg-white/40 backdrop-blur-sm">
          <h3 className="mb-2 text-sm font-bold text-[var(--sea-ink)] uppercase tracking-tight">Endpoint</h3>
          <code className="text-sm text-[var(--lagoon-deep)] font-mono">POST /api/concepts</code>
        </div>
        <div className="island-shell rounded-2xl p-6 border border-[var(--line)] bg-white/40 backdrop-blur-sm">
          <h3 className="mb-2 text-sm font-bold text-[var(--sea-ink)] uppercase tracking-tight">Payload</h3>
          <p className="text-sm text-[var(--sea-ink-soft)] font-mono">JSON object with name, timestamp, and description.</p>
        </div>
        <div className="island-shell rounded-2xl p-6 border border-[var(--line)] bg-white/40 backdrop-blur-sm">
          <h3 className="mb-2 text-sm font-bold text-[var(--sea-ink)] uppercase tracking-tight">Status</h3>
          <p className="text-sm text-[var(--sea-ink-soft)]">Real-time feedback on server-side processing.</p>
        </div>
      </section>
    </main>
  )
}
