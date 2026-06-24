import React, { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { createReservation, API_URL, fetchTickets, lockSeat, unlockSeat } from '../../shared/services/api'
import { useEvent } from '../events/hooks/useEvent'
import { useQuery } from '@tanstack/react-query'
import { SeatZoneMap } from '../events/components/SeatZoneMap'
import { SeatGrid } from '../events/components/SeatGrid'
import { Button } from '../../shared/ui/button'
import { Badge } from '../../shared/ui/badge'
import { useToast } from '../../shared/ui/Toast'
import { Skeleton } from '../../shared/ui/skeleton'
import { formatCurrency, formatLongDate, formatTime } from '../../shared/utils/format'
import { ErrorState } from '../../shared/components/ErrorState'
import { io } from 'socket.io-client'
import { useAuthStore } from '../../shared/stores/authStore'
import { Lock } from 'lucide-react'

export function SeatSelectionPage() {
  const { user } = useAuthStore()
  const { eventId } = useParams()
  const { data, isLoading, isError, refetch } = useEvent(eventId)
  const [selectedShow, setSelectedShow] = useState(null)
  const [selectedZone, setSelectedZone] = useState(null)
  const toast = useToast()
  
  const [showSeats, setShowSeats] = useState([])
  const [selectedSeats, setSelectedSeats] = useState([])
  const [gaQuantity, setGaQuantity] = useState(1) // For General Admission without exact seats
  
  const [isReserving, setIsReserving] = useState(false)
  const navigate = useNavigate()

  // Tạo idempotencyKey 1 lần, lưu sessionStorage để survive qua refresh
  const [idempotencyKey, setIdempotencyKey] = useState(() => {
    const storageKey = `idem:${eventId}`
    const existing = sessionStorage.getItem(storageKey)
    if (existing) return existing
    const newKey = crypto.randomUUID()
    sessionStorage.setItem(storageKey, newKey)
    return newKey
  })

  const { data: userTickets } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
    retry: 1
  })

  useEffect(() => {
    if (!selectedShow && data?.shows?.length > 0) {
      const firstAvailable = data.shows.find(s => !s.salesOpensAt || new Date(s.salesOpensAt) <= new Date())
      if (firstAvailable) {
        setSelectedShow(firstAvailable.id)
      }
    }
  }, [data, selectedShow])

  // Fetch show seats when show changes
  useEffect(() => {
    if (!selectedShow) return
    const fetchSeats = async () => {
      try {
        const res = await fetch(`${API_URL}/concerts/${eventId}/shows/${selectedShow}/seats`)
        if (res.ok) {
          const seatData = await res.json()
          const fetchedSeats = seatData?.data ?? seatData ?? []
          setShowSeats(fetchedSeats)
          
          // Auto-select seats that are locked by the current user
          if (user?.id) {
            const myLockedSeats = fetchedSeats.filter(s => s.lockedBy === user.id)
            if (myLockedSeats.length > 0) {
              setSelectedSeats(myLockedSeats)
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi lấy thông tin ghế', err)
      }
    }
    fetchSeats()
  }, [eventId, selectedShow, user?.id])

  // WebSocket for realtime updates
  useEffect(() => {
    if (!selectedShow) return

    const socketUrl = API_URL.replace('/api/v1', '')
    // Reconnection configuration to prevent infinite loops causing black screen
    const socket = io(`${socketUrl}/seats`, {
      reconnectionAttempts: 3,
      reconnectionDelay: 2000,
      autoConnect: true
    })

    socket.on('connect', () => {
      console.log('Connected to seat updates')
      socket.emit('join_show', { showId: selectedShow })
    })

    socket.on('connect_error', (error) => {
      console.warn('Seat updates connection error (Fallback to static):', error.message)
      socket.disconnect()
    })

    socket.on('seats_updated', (updates) => {
      setShowSeats(prev => prev.map(seat => {
        const update = updates.find(u => u.showSeatId === seat.id)
        if (update) {
          return { ...seat, status: update.status }
        }
        return seat
      }))

      // Update selectedSeats safely outside of the showSeats updater
      setSelectedSeats(currentSelected => {
        let hasChanges = false
        const nextSelected = currentSelected.filter(s => {
          const update = updates.find(u => u.showSeatId === s.id)
          // If the seat was updated to something other than AVAILABLE, remove it from selection
          if (update && update.status !== 'AVAILABLE') {
            if (update.lockedBy === user?.id) {
              return true // Keep it if we locked it ourselves
            }
            hasChanges = true
            return false
          }
          return true
        })
        return hasChanges ? nextSelected : currentSelected
      })
    })

    return () => {
      socket.emit('leave_show', { showId: selectedShow })
      socket.disconnect()
    }
  }, [selectedShow, user?.id])

  const zones = useMemo(() => {
    return data?.ticketTypes?.map(t => ({
      id: t.id,
      label: t.name,
      price: t.price,
      remaining: t.totalQuantity - t.soldQuantity,
      limitPerUser: t.maxPerOrder,
      colorCode: t.colorCode
    })) || []
  }, [data])

  useEffect(() => {
    if (!selectedZone && zones?.length) {
      setSelectedZone(zones[0].id)
    }
  }, [zones, selectedZone])

  const zone = useMemo(() => {
    return zones.find((item) => item.id === selectedZone)
  }, [zones, selectedZone])

  // Filter seats by the selected zone (ticketType)
  const visibleSeats = useMemo(() => {
    if (!selectedZone) return []
    return showSeats.filter(s => {
      if (!s || !s.ticketType) return false
      const matchId = s.ticketType.id === selectedZone
      const matchName = s.ticketType.name && selectedZone 
        ? s.ticketType.name.toLowerCase().includes(selectedZone.toLowerCase())
        : false
      return matchId || matchName
    })
  }, [showSeats, selectedZone])

  const maxSelectable = useMemo(() => {
    if (!zone) return 0;
    const existingCount = userTickets?.filter(t => {
      // Find matches for the selected zone based on the eventId and zone label
      const isEventMatch = t.eventId === eventId;
      const isZoneMatch = t.tier === zone.label; 
      return isEventMatch && isZoneMatch;
    })?.length || 0;
    return Math.max(0, zone.limitPerUser - existingCount);
  }, [zone, userTickets, eventId]);

  const handleToggleSeat = async (seat) => {
    const isAlreadySelected = selectedSeats.some(s => s.id === seat.id)
    if (isAlreadySelected) {
      try {
        await unlockSeat(seat.id)
        setSelectedSeats(prev => prev.filter(s => s.id !== seat.id))
      } catch (err) {
        console.error('Failed to unlock seat', err)
        setSelectedSeats(prev => prev.filter(s => s.id !== seat.id)) // Remove locally anyway
      }
    } else {
      if (selectedSeats.length >= maxSelectable) {
        toast.warning(maxSelectable === 0 
          ? `Bạn đã mua đủ giới hạn vé cho khu vực này.` 
          : `Bạn chỉ được chọn tối đa ${maxSelectable} vé (đã tính các vé mua trước đó).`)
        return
      }
      try {
        await lockSeat(seat.id)
        setSelectedSeats(prev => [...prev, seat])
      } catch (err) {
        toast.error('Ghế này đã bị người khác chọn. Vui lòng chọn ghế khác.')
        return
      }
    }
  }

  // Clear selections when component unmounts
  const selectedSeatsRef = React.useRef(selectedSeats);
  useEffect(() => {
    selectedSeatsRef.current = selectedSeats;
  }, [selectedSeats]);

  useEffect(() => {
    return () => {
      selectedSeatsRef.current.forEach(seat => {
        unlockSeat(seat.id).catch(console.error)
      })
    }
  }, [])

  // Clear selections when zone changes
  useEffect(() => {
    setSelectedSeats([])
    setGaQuantity(1)
  }, [selectedZone])

  const handleCheckout = async () => {
    try {
      if (!selectedShow) {
        toast.warning('Vui lòng chọn ngày giờ biểu diễn trước.')
        return
      }
      
      const isGaZone = visibleSeats.length === 0 && (zone?.label?.toLowerCase().includes('ga') || zone?.id === 'ga')
      
      if (!isGaZone && selectedSeats.length === 0) {
        toast.warning('Vui lòng chọn ít nhất 1 ghế trên sơ đồ.')
        return
      }

      setIsReserving(true)
      
      let items = []
      if (isGaZone) {
        // Fallback for General Admission (no exact seats)
        items = [{
          ticketTypeId: zone.id,
          showSeatId: null, // No exact seat
          quantity: gaQuantity
        }]
      } else {
        // Exact seats
        items = selectedSeats.map(seat => ({
          ticketTypeId: seat.ticketTypeId,
          showSeatId: seat.id,
          quantity: 1
        }))
      }

      const res = await createReservation(selectedShow, items, idempotencyKey)
      // Booking thành công → xóa key cũ, tạo key mới cho lần đặt tiếp theo
      sessionStorage.removeItem(`idem:${eventId}`)
      const newKey = crypto.randomUUID()
      sessionStorage.setItem(`idem:${eventId}`, newKey)
      setIdempotencyKey(newKey)
      navigate(`/checkout?bookingId=${res.id}&eventId=${eventId}&ticketTypeId=${zone?.id || selectedZone}&quantity=${isGaZone ? gaQuantity : selectedSeats.length}`)
    } catch (err) {
      toast.error('Không thể giữ chỗ. Vé có thể đã được người khác mua hoặc bạn chưa đăng nhập.')
      console.error(err)
    } finally {
      setIsReserving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-6">
        <Skeleton className="h-72 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <ErrorState
        title="Không tải được sơ đồ chỗ ngồi"
        description="Hiện tại chúng tôi không thể tải được thông tin vé."
        actionLabel="Thử lại"
        onAction={refetch}
      />
    )
  }

  const ticketTypeColors = zones.reduce((acc, z) => ({...acc, [z.id]: z.colorCode}), {})
  const isGaZone = visibleSeats.length === 0 && (zone?.label?.toLowerCase().includes('ga') || zone?.id === 'ga')

  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="accent">Bước 2 / 3</Badge>
          <span className="text-sm text-soft">Chọn ngày và số lượng vé</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold text-primary">{data.title}</h1>
          <p className="mt-2 text-sm text-muted">
            Chọn suất diễn, hạng vé và chọn ghế trực tiếp trên sơ đồ. Hệ thống sẽ giữ chỗ cho bạn trong khi thanh toán.
          </p>
        </div>

        {/* Show Selector */}
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-soft">
            Chọn suất diễn
          </p>
          <div className="flex flex-wrap gap-3">
            {data.shows?.map(show => {
              const isLocked = show.salesOpensAt && new Date(show.salesOpensAt) > new Date()
              return (
                <button
                  key={show.id}
                  type="button"
                  onClick={() => !isLocked && setSelectedShow(show.id)}
                  disabled={isLocked}
                  className={`flex flex-col items-start px-4 py-3 rounded-2xl border transition ${
                    isLocked ? 'opacity-50 cursor-not-allowed border-subtle bg-surface-2 text-muted' :
                    selectedShow === show.id
                      ? 'border-[color:var(--accent)] bg-accent-soft text-primary'
                      : 'border-subtle bg-surface-2 text-muted hover:bg-surface-3'
                  }`}
                >
                  <div className="flex justify-between w-full items-center gap-2">
                    <span className="font-semibold">{formatLongDate(show.startsAt)}</span>
                    {isLocked && <Lock className="w-3 h-3 text-error" />}
                  </div>
                  <span className="text-sm">{formatTime(show.startsAt)}</span>
                  {isLocked && <span className="text-[10px] text-error mt-1">Mở bán: {formatTime(show.salesOpensAt)} {formatLongDate(show.salesOpensAt)}</span>}
                </button>
              )
            })}
          </div>
        </div>

        <SeatZoneMap
          zones={zones}
          selectedZone={selectedZone}
          onSelect={setSelectedZone}
          seatMapUrl={data.seatMapUrl}
        />

        {visibleSeats.length > 0 ? (
          <div>
            <h3 className="text-lg font-semibold text-primary mt-8">
              Chọn ghế - {zone?.label}
            </h3>
            <SeatGrid 
              seats={visibleSeats} 
              selectedSeats={selectedSeats}
              onToggleSeat={handleToggleSeat}
              maxSelectable={maxSelectable}
              ticketTypeColors={ticketTypeColors}
            />
          </div>
        ) : isGaZone ? (
          <div className="mt-8 rounded-3xl border border-subtle p-8 text-center bg-surface-1">
            <h3 className="text-lg font-semibold text-primary mb-2">Khu vực vé đứng (GA)</h3>
            <p className="text-sm text-muted mb-6">Hạng vé này không có chỗ ngồi cụ thể. Vui lòng chọn số lượng vé bạn muốn mua.</p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                variant="secondary" 
                onClick={() => setGaQuantity(Math.max(1, gaQuantity - 1))}
                disabled={gaQuantity <= 1}
              >-</Button>
              <span className="text-xl font-semibold w-12">{gaQuantity}</span>
              <Button 
                variant="secondary" 
                onClick={() => setGaQuantity(Math.min(maxSelectable, gaQuantity + 1))}
                disabled={gaQuantity >= maxSelectable || gaQuantity >= (zone?.remaining || 0)}
              >+</Button>
            </div>
            <p className="mt-4 text-xs text-soft">
              {maxSelectable === 0 ? 'Bạn đã hết quyền mua loại vé này.' : `Còn được mua tối đa ${maxSelectable} vé (đã trừ vé đã mua).`}
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-subtle p-8 text-center text-muted">
            {showSeats.length > 0 
              ? 'Đang tải sơ đồ ghế...' 
              : 'Đang tải thông tin ghế...'}
          </div>
        )}
      </div>

      <aside className="flex h-fit flex-col gap-6 rounded-[32px] border border-subtle bg-surface-1 p-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.3em] text-soft">
            Hạng vé đang chọn
          </p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-primary">
              {zone?.label}
            </span>
            <span className="text-sm text-muted">
              Còn {zone?.remaining} vé
            </span>
          </div>
          <p className="text-sm text-muted">
            {formatCurrency(zone?.price || 0)} / vé
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between text-xs uppercase tracking-[0.3em] text-soft">
            <span>Đã chọn</span>
            <span>{isGaZone ? gaQuantity : selectedSeats.length} / {maxSelectable}</span>
          </div>
          {!isGaZone && selectedSeats.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedSeats.map(seat => (
                <div key={seat.id} className="rounded border border-subtle bg-surface-2 px-2 py-1 text-sm font-medium">
                  {seat?.seat?.label || 'Vé tự do'}
                </div>
              ))}
            </div>
          ) : isGaZone ? (
            <p className="text-sm font-medium text-primary">{gaQuantity} vé {zone?.label}</p>
          ) : (
            <p className="text-sm text-muted">Chưa chọn ghế nào.</p>
          )}
          <p className="text-xs text-soft">
            Giới hạn {zone?.limitPerUser || 4} vé trên mỗi tài khoản
          </p>
        </div>

        <div className="rounded-3xl border border-subtle bg-surface-2 p-4 text-sm text-muted">
          Tổng tạm tính
          <p className="mt-2 text-2xl font-semibold text-primary">
            {formatCurrency((zone?.price || 0) * (isGaZone ? gaQuantity : selectedSeats.length))}
          </p>
        </div>
        <div className="rounded-3xl border border-subtle bg-surface-2 p-4 text-xs text-soft">
          Hệ thống sẽ giữ chỗ trong một thời gian ngắn. Vui lòng thanh toán trước khi đếm ngược kết thúc để đảm bảo giữ được vé.
        </div>
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={handleCheckout} disabled={isReserving || (!isGaZone && selectedSeats.length === 0) || !selectedShow}>
            {isReserving ? 'Đang giữ chỗ...' : 'Tiếp tục thanh toán'}
          </Button>
          <Button asChild variant="secondary">
            <Link to={`/events/${data.id}`}>Quay lại sự kiện</Link>
          </Button>
        </div>
      </aside>
    </div>
  )
}
