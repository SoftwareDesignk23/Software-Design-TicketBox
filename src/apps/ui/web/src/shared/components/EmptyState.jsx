import { Link } from 'react-router-dom'
import { Button } from '../ui/button'

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-3xl border border-subtle bg-surface-1 p-8">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-primary">{title}</h3>
        <p className="text-muted">{description}</p>
      </div>
      {actionLabel ? (
        actionHref ? (
          <Button asChild variant="secondary">
            <Link to={actionHref}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button variant="secondary" onClick={onAction}>
            {actionLabel}
          </Button>
        )
      ) : null}
    </div>
  )
}
