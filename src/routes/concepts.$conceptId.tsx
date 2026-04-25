import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { 
  ArrowLeft, 
  Share2, 
  Zap, 
  BookOpen, 
  Link as LinkIcon, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  ChevronRight
} from 'lucide-react'

const getConceptDetails = createServerFn({
  method: 'GET',
})
  .inputValidator((conceptId: string) => parseInt(conceptId))
  .handler(async ({ data: conceptId }) => {
    const concept = await prisma.concept.findUnique({
      where: { id: conceptId },
      include: {
        outgoingEdges: {
          include: { target: true },
          orderBy: { weight: 'desc' },
          take: 5
        },
        incomingEdges: {
          include: { source: true },
          orderBy: { weight: 'desc' },
          take: 5
        },
        conflictsInitiated: {
          include: { conceptB: true }
        },
        conflictsReceived: {
          include: { conceptA: true }
        },
        workConcepts: {
          include: { 
            work: {
              include: { author: true }
            }
          },
          orderBy: { similarity: 'desc' },
          take: 10
        }
      }
    })

    if (!concept) throw new Error('Concept not found')
    return concept
  })

export const Route = createFileRoute('/concepts/$conceptId')({
  component: ConceptDetailPage,
  loader: async ({ params }) => await getConceptDetails({ data: params.conceptId }),
})

function ConceptDetailPage() {
  const concept = Route.useLoaderData()

  const allRelated = [
    ...concept.outgoingEdges.map(e => ({ ...e.target, relation: 'Related', weight: e.weight })),
    ...concept.incomingEdges.map(e => ({ ...e.source, relation: 'Influenced By', weight: e.weight }))
  ].sort((a, b) => b.weight - a.weight)

  const allConflicts = [
    ...concept.conflictsInitiated.map(c => c.conceptB),
    ...concept.conflictsReceived.map(c => c.conceptA)
  ]

  return (
    <main className="page-wrap px-4 py-12">
      <div className="mb-8">
        <Link
          to="/concepts"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sea-ink-soft)] hover:text-[var(--lagoon-deep)] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Ontology
        </Link>
      </div>

      <header className="island-shell rise-in relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 mb-12 border border-[var(--line)]">
        <div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(79,184,178,0.2),transparent_70%)]" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <span className="rounded-lg bg-[var(--lagoon-soft)] px-3 py-1 text-xs font-bold uppercase tracking-widest text-[var(--lagoon-deep)] shadow-sm">
              {concept.category}
            </span>
            {concept.isVerified && (
              <span className="flex items-center gap-1.5 rounded-lg bg-green-100 px-2 py-1 text-[10px] font-bold text-green-700 uppercase tracking-tighter">
                <ShieldCheck size={12} />
                Verified
              </span>
            )}
          </div>
          
          <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-6xl mb-6">
            {concept.name}
          </h1>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="text-xl text-[var(--sea-ink-soft)] leading-relaxed mb-8">
                {concept.description}
              </p>
              
              <div className="rounded-3xl bg-white/40 border border-[var(--line)] p-8 backdrop-blur-md">
                <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)] mb-4">
                  <Zap size={16} className="text-amber-500" />
                  Semantic Logic
                </h3>
                <p className="text-[var(--sea-ink-soft)] leading-relaxed italic">
                  "{concept.logic}"
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl bg-[var(--lagoon-deep)] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
                <h3 className="text-sm font-bold uppercase tracking-wider mb-4 opacity-80">Appeal</h3>
                <p className="text-lg font-medium leading-relaxed">
                  {concept.appeal}
                </p>
              </div>

              {allConflicts.length > 0 && (
                <div className="rounded-3xl bg-red-50 border border-red-100 p-8">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-red-900 mb-4">
                    <AlertTriangle size={16} />
                    Logical Conflicts
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allConflicts.map(c => (
                      <Link
                        key={c.id}
                        to="/concepts/$conceptId"
                        params={{ conceptId: c.id.toString() }}
                        className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-800 border border-red-200 hover:bg-red-100 transition-colors"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-12">
        <section className="lg:col-span-1">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)]">
              <Share2 size={18} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--sea-ink)]">Semantic Network</h2>
          </div>

          <div className="space-y-4">
            {allRelated.length > 0 ? (
              allRelated.map((rel) => (
                <Link
                  key={rel.id}
                  to="/concepts/$conceptId"
                  params={{ conceptId: rel.id.toString() }}
                  className="island-shell flex items-center justify-between p-5 rounded-2xl border border-[var(--line)] hover:border-[var(--lagoon-soft)] hover:bg-[var(--lagoon-soft)]/5 transition-all group"
                >
                  <div>
                    <h4 className="font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] transition-colors">{rel.name}</h4>
                    <p className="text-xs text-[var(--sea-ink-soft)] font-medium uppercase tracking-wider mt-1">{rel.relation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--sea-ink-soft)]">
                      {(rel.weight * 100).toFixed(0)}%
                    </span>
                    <ChevronRight size={16} className="text-[var(--sea-ink-soft)] group-hover:text-[var(--lagoon-deep)] transition-colors" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[var(--line)] p-12 text-center text-[var(--sea-ink-soft)]">
                Isolated Concept
              </div>
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)]">
              <BookOpen size={18} />
            </div>
            <h2 className="text-2xl font-bold text-[var(--sea-ink)]">Represented In</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {concept.workConcepts.map((wc) => (
              <Link
                key={wc.work.id}
                to="/authors/$authorId"
                params={{ authorId: wc.work.author.id.toString() }}
                className="island-shell flex flex-col p-6 rounded-2xl border border-[var(--line)] hover:border-[var(--lagoon-soft)] transition-all group"
              >
                <h4 className="font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] line-clamp-1">{wc.work.title}</h4>
                <p className="text-sm text-[var(--sea-ink-soft)] mb-4">by {wc.work.author.name}</p>
                <div className="mt-auto flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--lagoon-deep)]">
                    {Math.round(wc.similarity * 100)}% Match
                  </span>
                  <ExternalLink size={14} className="text-[var(--sea-ink-soft)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
            
            {concept.workConcepts.length === 0 && (
              <div className="sm:col-span-2 rounded-2xl border-2 border-dashed border-[var(--line)] p-12 text-center text-[var(--sea-ink-soft)]">
                No works linked to this concept yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
