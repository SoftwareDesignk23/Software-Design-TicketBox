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

	const skyTour = await prisma.event.upsert({
		where: { id: 'event-1' },
		update: {},
		create: {
			id: 'event-1',
			title: 'Skyline Beats Live',
			description: 'A high-energy concert night for pop and electronic music fans.',
			venueName: 'Saigon Exhibition and Convention Center',
			venueAddress: '799 Nguyen Van Linh, District 7, Ho Chi Minh City',
			startsAt: new Date('2026-08-15T19:30:00.000Z'),
			endsAt: new Date('2026-08-15T22:30:00.000Z'),
			salesOpensAt: new Date('2026-07-01T03:00:00.000Z'),
			status: 'PUBLISHED',
			heroImageUrl: '/images/events/skyline-beats.jpg',
			organizerId: organizer.id,
		},
	})

	const indieNight = await prisma.event.upsert({
		where: { id: 'event-2' },
		update: {},
		create: {
			id: 'event-2',
			title: 'Indie Night Saigon',
			description: 'An intimate live show featuring emerging Vietnamese indie artists.',
			venueName: 'Hoa Binh Theater',
			venueAddress: '240 3 Thang 2, District 10, Ho Chi Minh City',
			startsAt: new Date('2026-09-05T13:00:00.000Z'),
			endsAt: new Date('2026-09-05T16:00:00.000Z'),
			salesOpensAt: new Date('2026-07-20T03:00:00.000Z'),
			status: 'DRAFT',
			heroImageUrl: '/images/events/indie-night.jpg',
			organizerId: organizer.id,
		},
	})

	await prisma.eventAssignment.createMany({
		data: [
			{ userId: organizer.id, role: 'ORGANIZER', eventId: skyTour.id },
			{ userId: organizer.id, role: 'ORGANIZER', eventId: indieNight.id },
			{ userId: checkInStaff.id, role: 'CHECK_IN_STAFF', eventId: indieNight.id },
		],
		skipDuplicates: true,
	})

	await prisma.$disconnect()
}

main().catch(async (error) => {
	console.error(error)
	await prisma.$disconnect()
	process.exit(1)
})
