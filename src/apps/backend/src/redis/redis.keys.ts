export const redisKeys = {
	availability: (eventId: string, ticketTypeId: string) =>
		`booking:inventory:available:${eventId}:${ticketTypeId}`,
	reserved: (eventId: string, ticketTypeId: string) =>
		`booking:inventory:reserved:${eventId}:${ticketTypeId}`,
	sold: (eventId: string, ticketTypeId: string) =>
		`booking:inventory:sold:${eventId}:${ticketTypeId}`,
	pending: (scope: 'event' | 'ticketType', userId: string, scopeId: string) =>
		`booking:pending:${scope}:${userId}:${scopeId}`,
	queue: (eventId: string, ticketTypeId: string) => `booking:queue:${eventId}:${ticketTypeId}`,
	queueEntry: (eventId: string, ticketTypeId: string, userId: string) =>
		`booking:queue:entry:${eventId}:${ticketTypeId}:${userId}`,
	admission: (eventId: string, ticketTypeId: string, userId: string) =>
		`booking:admission:${eventId}:${ticketTypeId}:${userId}`,
	admissionActive: (eventId: string, ticketTypeId: string) =>
		`booking:admission:active:${eventId}:${ticketTypeId}`,
	lock: (resource: string) => `booking:lock:${resource}`,
}
