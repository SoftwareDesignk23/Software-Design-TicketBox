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

	const concerts = await Promise.all(
		[
			{
				id: 'concert-1',
				title: 'Skyline Beats Live',
				description: 'A high-energy concert night for pop and electronic music fans.',
				venueName: 'Saigon Exhibition and Convention Center',
				venueAddress: '799 Nguyen Van Linh, District 7, Ho Chi Minh City',
				startsAt: new Date('2026-08-15T19:30:00.000Z'),
				endsAt: new Date('2026-08-15T22:30:00.000Z'),
				salesOpensAt: new Date('2026-07-01T03:00:00.000Z'),
				heroImageUrl: '/images/concerts/skyline-beats.jpg',
			},
			{
				id: 'concert-2',
				title: 'Indie Night Saigon',
				description: 'An intimate live show featuring emerging Vietnamese indie artists.',
				venueName: 'Hoa Binh Theater',
				venueAddress: '240 3 Thang 2, District 10, Ho Chi Minh City',
				startsAt: new Date('2026-09-05T13:00:00.000Z'),
				endsAt: new Date('2026-09-05T16:00:00.000Z'),
				salesOpensAt: new Date('2026-07-20T03:00:00.000Z'),
				heroImageUrl: '/images/concerts/indie-night.jpg',
			},
			{
				id: 'concert-3',
				title: 'Hanoi Acoustic Evening',
				description: 'A warm acoustic showcase with singers, guitars, and stripped-down arrangements.',
				venueName: 'Cung Van Hoa Huu Nghi Viet Xo',
				venueAddress: '91 Tran Hung Dao, Hoan Kiem, Hanoi',
				startsAt: new Date('2026-10-10T13:30:00.000Z'),
				endsAt: new Date('2026-10-10T16:30:00.000Z'),
				salesOpensAt: new Date('2026-08-01T03:00:00.000Z'),
				heroImageUrl: '/images/concerts/hanoi-acoustic.jpg',
			},
			{
				id: 'concert-4',
				title: 'Da Nang Summer Sound',
				description: 'A seaside music festival night with pop, dance, and live band performances.',
				venueName: 'Bien Dong Park',
				venueAddress: 'Vo Nguyen Giap, Son Tra, Da Nang',
				startsAt: new Date('2026-11-21T12:00:00.000Z'),
				endsAt: new Date('2026-11-21T16:00:00.000Z'),
				salesOpensAt: new Date('2026-09-15T03:00:00.000Z'),
				heroImageUrl: '/images/concerts/danang-summer-sound.jpg',
			},
			{
				id: 'concert-5',
				title: 'Mekong Lights Festival',
				description: 'A festival concert blending folk-inspired arrangements with modern pop production.',
				venueName: 'Can Tho Stadium',
				venueAddress: 'Le Loi, Ninh Kieu, Can Tho',
				startsAt: new Date('2026-12-12T12:30:00.000Z'),
				endsAt: new Date('2026-12-12T16:30:00.000Z'),
				salesOpensAt: new Date('2026-10-01T03:00:00.000Z'),
				heroImageUrl: '/images/concerts/mekong-lights.jpg',
			},
		].map((concert) =>
			prisma.concert.upsert({
				where: { id: concert.id },
				update: {
					...concert,
					status: 'PUBLISHED',
					organizerId: organizer.id,
				},
				create: {
					...concert,
					status: 'PUBLISHED',
					organizerId: organizer.id,
				},
			}),
		),
	)

	await prisma.concertAssignment.createMany({
		data: [
			...concerts.map((concert) => ({
				userId: organizer.id,
				role: 'ORGANIZER' as const,
				concertId: concert.id,
			})),
			{ userId: checkInStaff.id, role: 'CHECK_IN_STAFF', concertId: 'concert-2' },
			{ userId: checkInStaff.id, role: 'CHECK_IN_STAFF', concertId: 'concert-4' },
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
