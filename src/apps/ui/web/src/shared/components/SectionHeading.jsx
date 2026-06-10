import { Badge } from '../ui/badge'

export function SectionHeading({ eyebrow, title, description, align = 'left' }) {
  const alignClass = align === 'center' ? 'text-center items-center' : 'text-left'

  return (
    <div className={`flex flex-col gap-3 ${alignClass}`}>
      {eyebrow ? <Badge variant="accent">{eyebrow}</Badge> : null}
      <div className="space-y-3">
        <h2 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-white/60 md:text-5xl lg:text-6xl">
          {title}
        </h2>
        {description ? <p className="text-lg text-muted font-light">{description}</p> : null}
      </div>
    </div>
  )
}
