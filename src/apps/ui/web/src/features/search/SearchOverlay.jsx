import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Input } from '../../shared/ui/input'
import { Badge } from '../../shared/ui/badge'
import { useUiStore } from '../../shared/stores/uiStore'
import { useSearch } from './hooks/useSearch'

export function SearchOverlay() {
  const { isSearchOpen, closeSearch } = useUiStore()
  const [query, setQuery] = useState('')
  const { results, isLoading } = useSearch(query)

  useEffect(() => {
    if (!isSearchOpen) {
      setQuery('')
    }
  }, [isSearchOpen])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        closeSearch()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeSearch])

  return (
    <AnimatePresence>
      {isSearchOpen ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-start justify-center bg-[color:color-mix(in_oklab,_var(--bg)_80%,_transparent)] px-4 py-20 backdrop-blur"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          onClick={closeSearch}
        >
          <motion.div
            className="w-full max-w-2xl rounded-3xl border border-subtle bg-surface-1 p-6 shadow-strong"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-primary">
                    Search events
                  </h2>
                  <p className="text-xs text-soft">
                    Find drops by artist, tour, or city.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeSearch}
                  className="text-sm text-muted hover:text-primary"
                >
                  Close
                </button>
              </div>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by artist, tour, or city"
                aria-label="Search events"
                autoFocus
              />
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="accent">Trending</Badge>
                <span className="text-sm text-muted">
                  Stadium drops this week
                </span>
              </div>
              <div className="grid gap-3">
                {isLoading ? (
                  <div className="rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-muted">
                    Loading search index...
                  </div>
                ) : null}
                {!isLoading && query && results.length === 0 ? (
                  <div className="rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-muted">
                    No events found. Try a city or artist name.
                  </div>
                ) : null}
                {results.map((event) => (
                  <Link
                    key={event.id}
                    to={`/events/${event.id}`}
                    onClick={closeSearch}
                    className="flex items-center justify-between rounded-2xl border border-subtle bg-surface-2 px-4 py-3 text-sm text-primary transition hover:bg-surface-3"
                  >
                    <span className="font-medium">{event.title}</span>
                    <span className="text-muted">{event.city}</span>
                  </Link>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-soft">
                <span>Press Esc to close</span>
                <span>Results update instantly</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
