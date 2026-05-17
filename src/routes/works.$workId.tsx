import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { WorkRepository } from '#/db/works/repository'
import { Book, ArrowLeft, Tag, AlertCircle, CheckCircle2, Plus, Sparkles } from 'lucide-react'

// Fetch the work details, linked concepts, and gaps
const getWorkDetails = createServerFn({ method: 'GET' })
  .inputValidator((workId: string) => parseInt(workId))
  .handler(async ({ data: workId }) => {
    const work = await prisma.work.findUnique({
      where: { id: workId },
      include: {
        author: true,
        workConcepts: {
          include: {
            concept: true
          },
          orderBy: { similarity: 'desc' }
        }
      }
    })

    if (!work) throw new Error('Work not found')

    // Also fetch the suggested "near misses"
    const suggestions = await WorkRepository.getSuggestedConcepts(workId)

    return { work, suggestions }
  })

// Server function to accept a suggestion and link the concept
const acceptSuggestionFn = createServerFn({ method: 'POST' })
  .inputValidator((data: { workId: number, conceptId: number, similarity: number }) => data)
  .handler(async ({ data }) => {
    await WorkRepository.linkConcept(data.workId, data.conceptId, data.similarity)
    
    // Check if this concept fills one of the missing categories
    const concept = await prisma.concept.findUnique({ where: { id: data.conceptId } })
    if (concept) {
      const work = await prisma.work.findUnique({ where: { id: data.workId } })
      if (work && work.missingCategories.includes(concept.category)) {
        const newMissing = work.missingCategories.filter(c => c !== concept.category)
        await prisma.work.update({
          where: { id: work.id },
          data: { missingCategories: newMissing }
        })
      }
    }
    
    return { success: true }
  })

export const Route = createFileRoute('/works/$workId')({
  component: WorkDetailPage,
  loader: async ({ params }) => await getWorkDetails({ data: params.workId }),
})

function WorkDetailPage() {
  const { work, suggestions } = Route.useLoaderData()
  const router = useRouter()

  const handleApprove = async (conceptId: number, similarity: number) => {
    await acceptSuggestionFn({ data: { workId: work.id, conceptId, similarity } })
    router.invalidate() // refresh data
  }

  return (
    <main className="page-wrap px-4 py-12">
      <div className="mb-8">
        <Link
          to={`/authors/${work.authorId}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:text-[var(--lagoon-deep)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to {work.author.name}
        </Link>
      </div>

      <header className="island-shell rise-in relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 mb-12 border border-[var(--line)]">
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)] shadow-lg">
            <Book size={48} />
          </div>
          <div className="flex-1">
            <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl mb-2">
              {work.title}
            </h1>
            <p className="text-lg font-medium text-[var(--lagoon-deep)] mb-6">
              By {work.author.name}
            </p>
            
            {work.description && (
              <div className="prose prose-sm prose-slate max-w-none text-[var(--sea-ink-soft)] leading-relaxed bg-white/40 rounded-2xl p-6 border border-[var(--line)]">
                {work.description}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Current State */}
        <div className="space-y-8">
          <section className="island-shell rounded-3xl p-8 border border-[var(--line)]">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--sea-ink)] mb-6">
              <CheckCircle2 className="text-[var(--lagoon-deep)]" />
              Linked Concepts
            </h2>
            <div className="flex flex-col gap-3">
              {work.workConcepts.length > 0 ? (
                work.workConcepts.map(wc => (
                  <div key={wc.concept.id} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-[var(--line)]">
                    <div>
                      <div className="font-semibold text-[var(--sea-ink)]">{wc.concept.name}</div>
                      <div className="text-xs text-[var(--sea-ink-soft)] capitalize">{wc.concept.category} / {wc.concept.subCategory}</div>
                    </div>
                    <span className="text-xs font-bold text-[var(--lagoon-deep)] bg-[var(--lagoon-soft)]/30 px-2 py-1 rounded-lg">
                      {Math.round(wc.similarity * 100)}% Match
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm italic text-[var(--sea-ink-soft)]">No concepts linked.</p>
              )}
            </div>
          </section>

          <section className="island-shell rounded-3xl p-8 border border-[var(--line)]">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--sea-ink)] mb-6">
              <AlertCircle className="text-amber-600" />
              Missing Categories (Gaps)
            </h2>
            <div className="flex flex-wrap gap-2">
              {work.missingCategories.length > 0 ? (
                work.missingCategories.map(cat => (
                  <span key={cat} className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold capitalize">
                    {cat}
                  </span>
                ))
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} /> Fully Mapped!
                </span>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Suggested Curation */}
        <div>
          <section className="island-shell rounded-3xl p-8 border border-[var(--lagoon-deep)]/20 shadow-[0_8px_30px_rgba(30,90,72,0.04)]">
            <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--sea-ink)] mb-2">
              <Sparkles className="text-[var(--lagoon-deep)]" />
              Suggested Concepts
            </h2>
            <p className="text-sm text-[var(--sea-ink-soft)] mb-6">
              These concepts scored between 58% and 63.4%, meaning they just barely missed the auto-link threshold. Review and approve them manually.
            </p>
            
            <div className="flex flex-col gap-3">
              {suggestions.length > 0 ? (
                suggestions.map((s: any) => (
                  <div key={s.id} className="group flex items-center justify-between p-4 rounded-xl bg-white border border-[var(--lagoon-soft)] transition-all hover:shadow-md">
                    <div>
                      <div className="font-semibold text-[var(--sea-ink)]">{s.name}</div>
                      <div className="text-xs text-[var(--sea-ink-soft)] capitalize">{s.category} / {s.subCategory}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-bold text-[var(--lagoon-deep)]">
                        {Math.round(s.similarity * 100)}%
                      </span>
                      <button 
                        onClick={() => handleApprove(s.id, s.similarity)}
                        className="flex items-center gap-1 bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)] hover:bg-[var(--lagoon-deep)] hover:text-white transition-colors px-3 py-1.5 rounded-lg text-sm font-bold"
                      >
                        <Plus size={16} /> Approve
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center border-2 border-dashed border-[var(--line)] rounded-xl">
                  <p className="text-sm text-[var(--sea-ink-soft)]">No near-miss suggestions found.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
