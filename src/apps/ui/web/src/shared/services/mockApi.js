import { events } from '../data/events'
import { tickets } from '../data/tickets'
import { notifications } from '../data/notifications'

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function fetchEvents() {
	await wait(600)
	return events
}

export async function fetchEventById(eventId) {
	await wait(500)
	return events.find((event) => event.id === eventId)
}

export async function fetchTickets() {
	await wait(600)
	return tickets
}

export async function fetchNotifications() {
	await wait(300)
	return notifications
}
