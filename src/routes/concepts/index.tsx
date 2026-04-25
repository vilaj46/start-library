import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { prisma } from '#/db'
import { useState, useMemo } from 'react'
import { 
  Search, 
  LayoutGrid, 
  Map as MapIcon, 
  Tag, 
  Sparkles, 
  ChevronRight, 
  Filter,
  CheckCircle2
} from 'lucide-react'

const getConcepts = createServerFn({
  method: 'GET',
}).handler(async () => {
  return await prisma.concept.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      category: true,
      subCategory: true,
      description: true,
      isVerified: true,
      _count: {
        select: { workConcepts: true }
      }
    },
    orderBy: { name: 'asc' }
  })
})

export const Route = createFileRoute('/concepts/')({
  component: ConceptsPage,
  loader: async () => await getConcepts(),
})

function ConceptsPage() {
  const allConcepts = Route.useLoaderData()
  const [view, setView] = useState<'grid' | 'map'>('grid')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = useMemo(() => {
    const cats = new Set(allConcepts.map(c => c.category))
    return Array.from(cats).sort()
  }, [allConcepts])

  const filteredConcepts = useMemo(() => {
    return allConcepts.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
                           c.description.toLowerCase().includes(search.toLowerCase())
      const matchesCategory = !selectedCategory || c.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [allConcepts, search, selectedCategory])

  const groupedConcepts = useMemo(() => {
    const groups: Record<string, typeof allConcepts> = {}
    filteredConcepts.forEach(c => {
      if (!groups[c.category]) groups[c.category] = []
      groups[c.category].push(c)
    })
    return groups
  }, [filteredConcepts])

  return (
    <main className="page-wrap px-4 py-12">
      <header className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--lagoon-soft)] text-[var(--lagoon-deep)]">
                <Sparkles size={20} />
              </div>
              <p className="island-kicker !mb-0 uppercase tracking-widest">Ontology Explorer</p>
            </div>
            <h1 className="display-title text-4xl font-bold text-[var(--sea-ink)] sm:text-5xl">
              Concepts
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-[var(--sea-ink-soft)]">
              Discover the semantic building blocks of your library. These concepts bridge the gap between works and universal themes.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-[var(--line)]/30 p-1.5 border border-[var(--line)]">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                view === 'grid' 
                  ? 'bg-white text-[var(--lagoon-deep)] shadow-sm' 
                  : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
              }`}
            >
              <LayoutGrid size={18} />
              Grid
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                view === 'map' 
                  ? 'bg-white text-[var(--lagoon-deep)] shadow-sm' 
                  : 'text-[var(--sea-ink-soft)] hover:text-[var(--sea-ink)]'
              }`}
            >
              <MapIcon size={18} />
              Map
            </button>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sea-ink-soft)]" size={20} />
            <input
              type="text"
              placeholder="Search concepts, themes, or descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-[var(--line)] bg-white py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--lagoon-soft)] transition-all shadow-sm"
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold border transition-all ${
                !selectedCategory 
                  ? 'bg-[var(--sea-ink)] text-white border-[var(--sea-ink)]' 
                  : 'bg-white text-[var(--sea-ink-soft)] border-[var(--line)] hover:border-[var(--sea-ink-soft)]'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold border transition-all ${
                  selectedCategory === cat 
                    ? 'bg-[var(--lagoon-deep)] text-white border-[var(--lagoon-deep)]' 
                    : 'bg-white text-[var(--sea-ink-soft)] border-[var(--line)] hover:border-[var(--lagoon-soft)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {view === 'grid' ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredConcepts.map((concept) => (
            <Link
              key={concept.id}
              to="/concepts/$conceptId"
              params={{ conceptId: concept.id.toString() }}
              className="island-shell group relative flex flex-col rounded-3xl p-6 border border-[var(--line)] bg-white/50 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(30,90,72,0.1)] no-underline"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="rounded-lg bg-[var(--lagoon-soft)]/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--lagoon-deep)]">
                  {concept.category}
                </span>
                {concept.isVerified && (
                  <CheckCircle2 size={16} className="text-green-500" />
                )}
              </div>
              
              <h3 className="text-lg font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] transition-colors mb-2">
                {concept.name}
              </h3>
              
              <p className="text-sm text-[var(--sea-ink-soft)] line-clamp-3 mb-6 flex-1 leading-relaxed">
                {concept.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--sea-ink-soft)]">
                  <Tag size={12} />
                  <span>{concept._count.workConcepts} Linked Works</span>
                </div>
                <div className="text-[var(--lagoon-deep)] opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                  <ChevronRight size={18} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {Object.entries(groupedConcepts).map(([category, concepts]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--line)]" />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[var(--lagoon-deep)] px-4">
                  {category}
                </h2>
                <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--line)]" />
              </div>
              
              <div className="flex flex-wrap gap-4 justify-center">
                {concepts.map(concept => (
                  <Link 
                    key={concept.id}
                    to="/concepts/$conceptId"
                    params={{ conceptId: concept.id.toString() }}
                    className="island-shell group w-64 rounded-2xl p-5 border border-[var(--line)] hover:border-[var(--lagoon-soft)] transition-all hover:bg-[var(--lagoon-soft)]/5 no-underline"
                  >
                    <h3 className="text-sm font-bold text-[var(--sea-ink)] group-hover:text-[var(--lagoon-deep)] mb-1">
                      {concept.name}
                    </h3>
                    <p className="text-[10px] text-[var(--sea-ink-soft)] font-medium uppercase tracking-wider mb-2">
                      {concept.subCategory}
                    </p>
                    <p className="text-xs text-[var(--sea-ink-soft)] line-clamp-2 leading-relaxed">
                      {concept.description}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredConcepts.length === 0 && (
        <div className="py-24 text-center rounded-[3rem] border-2 border-dashed border-[var(--line)] bg-white/30 backdrop-blur-sm animate-in fade-in duration-700">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--lagoon-soft)]/30 text-[var(--lagoon-deep)] mb-6">
            <Filter size={32} />
          </div>
          <h3 className="text-xl font-bold text-[var(--sea-ink)] mb-2">No matching concepts</h3>
          <p className="text-[var(--sea-ink-soft)] max-w-xs mx-auto">
            Try adjusting your search or category filters to find what you're looking for.
          </p>
        </div>
      )}
    </main>
  )
}
