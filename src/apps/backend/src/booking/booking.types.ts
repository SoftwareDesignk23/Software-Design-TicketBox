export type ReservationStatus =
	| 'PENDING'
	| 'COMPLETED'
	| 'CANCELLED'
	| 'EXPIRED'
	| 'RECONCILIATION_REQUIRED'

export type QueueStatus = 'WAITING' | 'ADMITTED' | 'EXPIRED' | 'SOLD_OUT'

export type AvailabilitySnapshot = {
	eventId: string
	items: Array<{
		ticketTypeId: string
		available: number
		reserved: number
		sold: number
		version: number
	}>
}

export type AvailabilityEvent = {
	eventId: string
	ticketTypeId: string
	available: number
	reserved: number
	sold: number
	version: number
	reason: string
}
