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
            viewBox="0 0 520 260"
            className="h-60 w-full"
            role="img"
            aria-label="Bản đồ các khu vực"
          >
            <rect x="40" y="30" width="120" height="70" rx="16" fill={zoneColor('svip')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('svip') || z.id === 'svip')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <rect x="200" y="30" width="120" height="70" rx="16" fill={zoneColor('vip')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('vip') && !z.label?.toLowerCase().includes('svip'))?.id || 'vip')} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <rect x="360" y="30" width="120" height="70" rx="16" fill={zoneColor('cat1')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('cat1') || z.id === 'cat1')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <rect x="80" y="130" width="150" height="80" rx="18" fill={zoneColor('cat2')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('cat2') || z.id === 'cat2')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <rect x="290" y="130" width="150" height="80" rx="18" fill={zoneColor('ga')} onClick={() => onSelect(zones.find(z => z.label?.toLowerCase().includes('ga') || z.id === 'ga')?.id)} className="cursor-pointer hover:opacity-80 transition-opacity" />
            <rect x="200" y="225" width="120" height="18" rx="9" fill="var(--surface-3)" />
            
            {/* Labels overlay */}
            <text x="100" y="70" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">SVIP</text>
            <text x="260" y="70" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">VIP</text>
            <text x="420" y="70" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">CAT 1</text>
            <text x="155" y="175" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">CAT 2</text>
            <text x="365" y="175" fill="white" fontSize="14" fontWeight="bold" textAnchor="middle" pointerEvents="none">GA</text>
            <text x="260" y="238" fill="var(--muted)" fontSize="10" fontWeight="bold" textAnchor="middle" pointerEvents="none">SÂN KHẤU</text>
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
