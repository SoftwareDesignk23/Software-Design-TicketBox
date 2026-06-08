import { formatCurrency } from '../../../shared/utils/format'

export function SeatZoneMap({ zones, selectedZone, onSelect, seatMapUrl }) {
  const zoneColor = (zoneId) => {
    if (zoneId === selectedZone) {
      return 'var(--accent)'
    }
    const zone = zones.find(z => z.label?.toLowerCase().includes(zoneId) || z.id === zoneId);
    return zone?.colorCode || 'var(--surface-2)'
  }

  return (
    <div className="rounded-3xl border border-subtle bg-surface-1 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-primary">
            Sơ đồ khu vực
          </h3>
          <p className="text-sm text-muted">
            Chọn một khu vực trên sơ đồ để xem các ghế trống.
          </p>
        </div>
        <span className="text-xs text-soft">Khu vực sân khấu</span>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-subtle bg-[color:var(--ink-800)] p-4 flex items-center justify-center">
        {seatMapUrl && false ? (
          <img src={seatMapUrl} alt="Sơ đồ ghế" className="w-full h-auto object-contain max-h-60" />
        ) : (
          <svg
            viewBox="0 0 520 360"
            className="w-full h-auto max-h-[400px]"
            role="img"
            aria-label="Bản đồ các khu vực"
          >
            {/* Stage Indicator */}
            <path d="M 120 40 L 120 30 L 220 30 M 300 30 L 400 30 L 400 40" stroke="var(--muted)" strokeWidth="2" fill="none" />
            <text x="260" y="35" fill="var(--muted)" fontSize="14" fontWeight="bold" textAnchor="middle">STAGE</text>

            {/* SVIP */}
            <rect x="200" y="70" width="120" height="40" rx="12" fill={zoneColor('svip')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('svip') || z.id === 'svip')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <text x="260" y="95" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">SVIP</text>

            {/* VIP */}
            <rect x="200" y="125" width="120" height="40" rx="12" fill={zoneColor('vip')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('vip') && !z.label?.toLowerCase().includes('svip'))?.id || 'vip')} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <text x="260" y="150" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">VIP</text>

            {/* CAT 1 Left */}
            <rect x="100" y="180" width="100" height="40" rx="12" fill={zoneColor('cat1')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().replace(/\s/g,'').includes('cat1') || z.id === 'cat1')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <text x="150" y="205" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">CAT 1</text>

            {/* CAT 1 Right */}
            <rect x="320" y="180" width="100" height="40" rx="12" fill={zoneColor('cat1')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().replace(/\s/g,'').includes('cat1') || z.id === 'cat1')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <text x="370" y="205" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">CAT 1</text>

            {/* CAT 2 Left */}
            <rect x="100" y="235" width="100" height="40" rx="12" fill={zoneColor('cat2')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().replace(/\s/g,'').includes('cat2') || z.id === 'cat2')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <text x="150" y="260" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">CAT 2</text>

            {/* CAT 2 Right */}
            <rect x="320" y="235" width="100" height="40" rx="12" fill={zoneColor('cat2')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().replace(/\s/g,'').includes('cat2') || z.id === 'cat2')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <text x="370" y="260" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">CAT 2</text>

            {/* GA */}
            <rect x="200" y="290" width="120" height="40" rx="12" fill={zoneColor('ga')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('ga') || z.id === 'ga')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <text x="260" y="315" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">GA</text>
          </svg>
        )}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {zones.map((zone) => (
          <button
            key={zone.id}
            type="button"
            onClick={() => onSelect(zone.id)}
            aria-pressed={selectedZone === zone.id}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
              selectedZone === zone.id
                ? 'border-[color:var(--accent)] bg-accent-soft text-primary'
                : 'border-subtle bg-surface-2 text-muted hover:bg-surface-3'
            }`}
          >
            <span className="font-semibold text-primary">{zone.label}</span>
            <span>{formatCurrency(zone.price)}</span>
          </button>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-soft">
        <span>Sơ đồ chỉ mang tính chất minh họa.</span>
        <span>Ghế trống được cập nhật theo thời gian thực.</span>
      </div>
    </div>
  )
}
