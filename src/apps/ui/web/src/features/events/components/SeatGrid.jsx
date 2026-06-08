import React from 'react'
import { formatCurrency } from '../../../shared/utils/format'

export function SeatGrid({ seats, selectedSeats, onToggleSeat, maxSelectable, ticketTypeColors }) {
  const rows = {}
  seats.forEach(seat => {
    const row = seat?.seat?.row || 'Default'
    if (!rows[row]) rows[row] = []
    rows[row].push(seat)
  })

  // Sort rows (assuming alphabetical)
  const sortedRows = Object.keys(rows).sort()

  const handleSeatClick = (seat) => {
    if (seat.status !== 'AVAILABLE') return
    onToggleSeat(seat)
  }

  // Get the first available color for legend
  const sampleColorCode = Object.values(ticketTypeColors)[0] || '#FFD700'

  return (
    <div className="mt-6 rounded-3xl border border-subtle bg-surface-1 p-6 overflow-x-auto">
      <div className="min-w-max space-y-4">
        {sortedRows.map(row => (
          <div key={row} className="flex items-center gap-4">
            <span className="w-8 font-semibold text-soft text-right">{row}</span>
            <div className="flex gap-2">
              {rows[row].map(seat => {
                const isSelected = selectedSeats.some(s => s.id === seat.id)
                // If it's selected by us, treat it as available so we can interact with it and it looks fully opaque
                const isAvailable = seat.status === 'AVAILABLE' || isSelected
                let colorCode = ticketTypeColors[seat.ticketTypeId] || 'var(--surface-3)'

                let backgroundColor = isAvailable ? colorCode : 'var(--surface-3)'
                let borderColor = isAvailable ? colorCode : 'var(--border-subtle)'
                let opacity = isAvailable ? 'opacity-100' : 'opacity-40 cursor-not-allowed'
                
                if (isSelected) {
                  backgroundColor = 'var(--accent)'
                  borderColor = 'var(--accent)'
                }

                return (
                  <button
                    key={seat.id}
                    title={`${seat?.seat?.label || 'Chưa xếp'} - ${formatCurrency(seat?.ticketType?.price || 0)}`}
                    onClick={() => onToggleSeat(seat)} // Don't check seat.status here, let onToggleSeat handle it or handle it by disabled prop
                    disabled={!isAvailable}
                    className={`h-8 w-8 rounded-t-lg rounded-b-sm border-2 text-xs font-medium transition flex items-center justify-center ${opacity}`}
                    style={{
                      backgroundColor,
                      borderColor,
                      color: isSelected ? 'white' : (isAvailable ? 'black' : 'var(--text-muted)')
                    }}
                  >
                    {seat?.seat?.number || ''}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-6 text-sm text-muted justify-center border-t border-subtle pt-6">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-t-sm bg-surface-3 border border-subtle"></div>
          <span>Đã bán/Khóa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-t-sm" style={{ backgroundColor: 'var(--accent)' }}></div>
          <span>Đang chọn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-t-sm border border-subtle" style={{ backgroundColor: sampleColorCode }}></div>
          <span>Ghế trống</span>
        </div>
      </div>
    </div>
  )
}
