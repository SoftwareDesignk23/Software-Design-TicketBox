import { Link } from 'react-router-dom'
import { Button } from '../../shared/ui/button'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4 rounded-[32px] border border-subtle bg-surface-1 p-8">
      <h1 className="text-2xl font-semibold text-primary">Page not found</h1>
      <p className="text-muted">
        This page is not part of the TicketBox flow. Head back to the concert
        lineup.
      </p>
      <Button asChild>
        <Link to="/events">Go to events</Link>
      </Button>
    </div>
  )
}
