import { Button } from '../ui/button'

export function ErrorState({ title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-start gap-4 rounded-3xl border border-subtle bg-surface-1 p-8">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold text-primary">{title}</h3>
        <p className="text-muted">{description}</p>
      </div>
      {actionLabel ? (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
