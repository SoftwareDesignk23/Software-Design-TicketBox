import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
	const passwordHash = await bcrypt.hash('password123', 10)

	const audience = await prisma.user.upsert({
		where: { email: 'audience@ticketbox.local' },
		update: {},
		create: {
			email: 'audience@ticketbox.local',
			displayName: 'Avery Audience',
			role: 'AUDIENCE',
			passwordHash,
		},
	})

	const organizer = await prisma.user.upsert({
		where: { email: 'organizer@ticketbox.local' },
		update: {},
		create: {
			email: 'organizer@ticketbox.local',
			displayName: 'Olivia Organizer',
			role: 'ORGANIZER',
			passwordHash,
		},
	})

	const checkInStaff = await prisma.user.upsert({
		where: { email: 'checkin@ticketbox.local' },
		update: {},
		create: {
			email: 'checkin@ticketbox.local',
			displayName: 'Cameron Check-In',
			role: 'CHECK_IN_STAFF',
			passwordHash,
		},
	})

	await prisma.user.upsert({
		where: { email: 'admin@ticketbox.local' },
		update: {},
		create: {
			email: 'admin@ticketbox.local',
			displayName: 'Ada Admin',
			role: 'ADMIN',
			passwordHash,
		},
	})

	await prisma.eventAssignment.createMany({
		data: [
			{ userId: organizer.id, role: 'ORGANIZER', eventId: 'event-1' },
			{ userId: organizer.id, role: 'ORGANIZER', eventId: 'event-2' },
			{ userId: checkInStaff.id, role: 'CHECK_IN_STAFF', eventId: 'event-2' },
		],
		skipDuplicates: true,
	})

	const event = await prisma.event.upsert({
		where: { id: 'event-1' },
		update: { name: 'Summer Jam' },
		create: {
			id: 'event-1',
			name: 'Summer Jam',
		},
	})

	const general = await prisma.ticketType.upsert({
		where: { id: 'ticket-general' },
		update: { name: 'General Admission', totalCapacity: 100 },
		create: {
			id: 'ticket-general',
			eventId: event.id,
			name: 'General Admission',
			priceCents: 5000,
			totalCapacity: 100,
		},
	})

	await prisma.ticketInventory.upsert({
		where: { ticketTypeId: general.id },
		update: {
			available: 100,
			reserved: 0,
			sold: 0,
			version: 0,
		},
		create: {
			ticketTypeId: general.id,
			available: 100,
			reserved: 0,
			sold: 0,
			version: 0,
		},
	})

	await prisma.$disconnect()
}

main().catch(async (error) => {
	console.error(error)
	await prisma.$disconnect()
	process.exit(1)
})
