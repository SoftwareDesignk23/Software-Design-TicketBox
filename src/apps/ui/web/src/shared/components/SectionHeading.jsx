import { Badge } from '../ui/badge'

export function SectionHeading({ eyebrow, title, description, align = 'left' }) {
  const alignClass = align === 'center' ? 'text-center items-center' : 'text-left'

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      {eyebrow ? <Badge variant="accent">{eyebrow}</Badge> : null}
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold text-primary md:text-4xl">
          {title}
        </h2>
        {description ? <p className="text-muted">{description}</p> : null}
      </div>
    </div>
  )
}
