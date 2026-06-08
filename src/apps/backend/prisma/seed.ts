import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
	console.log('Clearing database...')
	// Clean up all tables due to relations
	await prisma.checkInLog.deleteMany()
	await prisma.ticket.deleteMany()
	await prisma.payment.deleteMany()
	await prisma.bookingItem.deleteMany()
	await prisma.booking.deleteMany()

	await prisma.showSeat.deleteMany()
	await prisma.seat.deleteMany()
	await prisma.seatSection.deleteMany()
	await prisma.ticketType.deleteMany()

	await prisma.concertArtist.deleteMany()
	await prisma.concertSponsor.deleteMany()
	await prisma.concertShow.deleteMany()

	await prisma.concert.deleteMany()
	await prisma.artist.deleteMany()
	await prisma.sponsor.deleteMany()
	await prisma.venue.deleteMany()
	await prisma.organizer.deleteMany()

	await prisma.user.deleteMany()

	console.log('Seeding data...')
	const passwordHash = await bcrypt.hash('password123', 10)

	// 1. Create Users
	const admin = await prisma.user.create({
		data: {
			email: 'admin@ticketbox.local',
			passwordHash,
			displayName: 'System Admin',
			role: 'ADMIN',
		},
	})

	const audience = await prisma.user.create({
		data: {
			email: 'audience@ticketbox.local',
			passwordHash,
			displayName: 'Lê Thành Công',
			phoneNumber: '0987654321',
			role: 'AUDIENCE',
		},
	})

	// 2. Create Organizers
	const datVietVac = await prisma.organizer.create({
		data: {
			name: 'DatVietVAC',
			description: 'Công ty Cổ phần Tổ hợp Truyền thông Đất Việt (DatVietVAC Group Holdings).',
			website: 'https://datvietvac.vn/',
			logoUrl:
				'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/datvietvac_1_716b1e5dc4.jpg',
		},
	})

	const yeah1 = await prisma.organizer.create({
		data: {
			name: 'YEA1 Entertainment',
			description: 'Tập đoàn Truyền thông Yeah1',
			website: 'https://yeah1.com',
		},
	})

	const viettel = await prisma.organizer.create({
		data: {
			name: 'Viettel Telecom',
			description: 'Tập đoàn Công nghiệp - Viễn thông Quân đội Viettel',
			website: 'https://vietteltelecom.vn',
		},
	})

	// 3. Create Artists
	const hieuthuhai = await prisma.artist.create({
		data: {
			name: 'HIEUTHUHAI',
			avatarUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/hieuthuhai.jpg',
			bio: 'Trần Minh Hiếu, nghệ danh HIEUTHUHAI, là một nam rapper người Việt Nam.',
		},
	})
	const isaac = await prisma.artist.create({
		data: {
			name: 'Isaac',
			avatarUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/isaac.jpg',
			bio: 'Phạm Lưu Tuấn Tài, nghệ danh Isaac, là một nam ca sĩ, diễn viên người Việt Nam.',
		},
	})
	const mlee = await prisma.artist.create({
		data: {
			name: 'MLee',
			avatarUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/mlee.jpg',
			bio: 'Quách Tapiau Maily, nghệ danh MLee, là một nữ ca sĩ, rapper, diễn viên.',
		},
	})
	const mono = await prisma.artist.create({
		data: {
			name: 'MONO',
			avatarUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/mono.jpg',
			bio: 'Nguyễn Việt Hoàng, nghệ danh MONO, là nam ca sĩ người Việt Nam.',
		},
	})
	const tlinh = await prisma.artist.create({
		data: {
			name: 'tlinh',
			avatarUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/tlinh.jpg',
			bio: 'Nguyễn Thảo Linh, nghệ danh tlinh, là nữ rapper, ca sĩ, nhạc sĩ.',
		},
	})
	const phuongMyChi = await prisma.artist.create({
		data: {
			name: 'Phương Mỹ Chi',
			avatarUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/phuongmychi.jpg',
			bio: 'Phương Mỹ Chi là nữ ca sĩ chuyên hát nhạc dân ca Nam bộ Việt Nam.',
		},
	})
	const denVau = await prisma.artist.create({
		data: {
			name: 'Đen Vâu',
			avatarUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/denvau.jpg',
			bio: 'Nguyễn Đức Cường, nghệ danh Đen Vâu, là một nam rapper người Việt Nam.',
		},
	})

	// 4. Create Sponsors
	const mbBank = await prisma.sponsor.create({
		data: { name: 'MB Bank', description: 'Ngân hàng TMCP Quân Đội' },
	})
	const pepsi = await prisma.sponsor.create({
		data: { name: 'Pepsi', description: 'Nước giải khát Pepsi' },
	})

	// 5. Create Venues
	const svdQuanKhu7 = await prisma.venue.create({
		data: {
			name: 'Sân vận động Quân khu 7',
			address: '202 Hoàng Văn Thụ, Phường 9, Phú Nhuận, Hồ Chí Minh',
			capacity: 25000,
			mapUrl: 'https://maps.app.goo.gl/qDqwT8CgUfF9W2F48',
		},
	})
	const nhaThiDauPhuTho = await prisma.venue.create({
		data: {
			name: 'Nhà thi đấu Phú Thọ',
			address: '219 Lý Thường Kiệt, Phường 15, Quận 11, Hồ Chí Minh',
			capacity: 5000,
			mapUrl: 'https://maps.app.goo.gl/fK8jXz2YpQw7K2',
		},
	})
	const svdMyDinh = await prisma.venue.create({
		data: {
			name: 'Sân vận động Quốc gia Mỹ Đình',
			address: 'Đường Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm, Hà Nội',
			capacity: 40000,
			mapUrl: 'https://maps.app.goo.gl/SVdMyDinh',
		},
	})

	// --- HELPER FUNCTION TO SEED SEATS ---
	const createVenueSeatsAndTickets = async (venueId: string, showId: string, concertId: string) => {
		// Ticket Types: SVIP, VIP, CAT1, CAT2, GA
		const ticketTypes = [
			{ name: 'SVIP', price: 5000000, colorCode: '#FFD700', max: 2, qty: 50 },
			{ name: 'VIP', price: 3000000, colorCode: '#C0C0C0', max: 2, qty: 100 },
			{ name: 'CAT1', price: 2000000, colorCode: '#1E90FF', max: 4, qty: 150 },
			{ name: 'CAT2', price: 1500000, colorCode: '#32CD32', max: 4, qty: 200 },
			{ name: 'GA', price: 800000, colorCode: '#CD7F32', max: 6, qty: 500 },
		]

		const createdTypes: any[] = []

		for (const type of ticketTypes) {
			const ticketType = await prisma.ticketType.create({
				data: {
					concertId,
					name: type.name,
					price: type.price,
					totalQuantity: type.qty,
					colorCode: type.colorCode,
					maxPerOrder: type.max,
				},
			})
			createdTypes.push(ticketType)

			// We don't generate explicit seats for GA since it's standing area
			if (type.name === 'GA') continue

			let section = await prisma.seatSection.findUnique({
				where: { venueId_name: { venueId, name: `Khu ${type.name}` } },
			})
			if (!section) {
				section = await prisma.seatSection.create({
					data: { venueId, name: `Khu ${type.name}`, capacity: type.qty },
				})
			}

			// Generate seats for this section (e.g. Row A, Row B...)
			let seatsInDb = await prisma.seat.findMany({ where: { sectionId: section.id } })
			if (seatsInDb.length === 0) {
				const seatsData: any[] = []
				const rows = ['A', 'B', 'C', 'D', 'E', 'F']
				let seatCount = 0
				for (const row of rows) {
					for (let i = 1; i <= 20; i++) {
						if (seatCount >= type.qty) break
						seatsData.push({ sectionId: section.id, label: `${row}${i}`, row, number: i })
						seatCount++
					}
				}
				await prisma.seat.createMany({ data: seatsData })
				seatsInDb = await prisma.seat.findMany({ where: { sectionId: section.id } })
			}

			// Assign seats to the show
			const showSeatsData = seatsInDb.map((seat) => ({
				showId,
				seatId: seat.id,
				ticketTypeId: ticketType.id,
				status: 'AVAILABLE' as const,
			}))
			await prisma.showSeat.createMany({ data: showSeatsData })
		}
	}

	// 6. Concert 1: Anh Trai Say Hi
	const atshConcert = await prisma.concert.create({
		data: {
			title: 'Anh Trai Say Hi - Live Concert',
			description:
				'<h1>Concert hoành tráng nhất năm 2024</h1><p>Quy tụ dàn anh trai cực hot từ chương trình thực tế Anh Trai Say Hi.</p>',
			heroImageUrl:
				'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/anh_trai_say_hi_banner.jpg',
			seatMapUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/seatmap-atsh.png',
			organizerId: datVietVac.id,
			venueId: svdQuanKhu7.id,
			status: 'PUBLISHED',
			artists: {
				create: [
					{ artistId: hieuthuhai.id, role: 'Ca sĩ chính' },
					{ artistId: isaac.id, role: 'Ca sĩ chính' },
				],
			},
			sponsors: {
				create: [{ sponsorId: mbBank.id, tier: 'Kim cương' }],
			},
		},
	})

	const atshDay1 = await prisma.concertShow.create({
		data: {
			concertId: atshConcert.id,
			startsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // in 10 days
			endsAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
			salesOpensAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // opened yesterday
		},
	})
	await createVenueSeatsAndTickets(svdQuanKhu7.id, atshDay1.id, atshConcert.id)

	// 7. Concert 2: Chị Đẹp Đạp Gió Rẽ Sóng
	const cddgrsConcert = await prisma.concert.create({
		data: {
			title: 'Chị Đẹp Đạp Gió Rẽ Sóng 2024',
			description: '<h1>Đêm chung kết và trao giải</h1>',
			heroImageUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/chi_dep.jpg',
			seatMapUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/seatmap-atsh.png',
			organizerId: yeah1.id,
			venueId: nhaThiDauPhuTho.id,
			status: 'PUBLISHED',
			artists: {
				create: [{ artistId: mlee.id, role: 'Thành viên LUNAS' }],
			},
		},
	})

	const cddgrsShow = await prisma.concertShow.create({
		data: {
			concertId: cddgrsConcert.id,
			startsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
			endsAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
			salesOpensAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // starts in 5 days
		},
	})
	await createVenueSeatsAndTickets(nhaThiDauPhuTho.id, cddgrsShow.id, cddgrsConcert.id)

	// 8. Concert 3: Anh Trai Vượt Ngàn Chông Gai
	const atvncgConcert = await prisma.concert.create({
		data: {
			title: 'Anh Trai Vượt Ngàn Chông Gai - The Concert',
			description: '<h1>Siêu concert đỉnh cao</h1><p>Đêm hội tụ 33 anh tài.</p>',
			heroImageUrl:
				'https://images.unsplash.com/photo-1540039155732-68473500d1cb?q=80&w=1200&auto=format&fit=crop', // Placeholder
			seatMapUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/seatmap-atsh.png',
			organizerId: viettel.id,
			venueId: svdMyDinh.id,
			status: 'PUBLISHED',
			artists: {
				create: [{ artistId: denVau.id, role: 'Ca sĩ khách mời' }],
			},
			sponsors: {
				create: [{ sponsorId: pepsi.id, tier: 'Độc quyền' }],
			},
		},
	})

	const atvncgShow = await prisma.concertShow.create({
		data: {
			concertId: atvncgConcert.id,
			startsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
			endsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
			salesOpensAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
		},
	})
	await createVenueSeatsAndTickets(svdMyDinh.id, atvncgShow.id, atvncgConcert.id)

	// 9. Concert 4: Em Xinh Say Hi
	const emxinhConcert = await prisma.concert.create({
		data: {
			title: 'Em Xinh Say Hi - School Fest',
			description: '<h1>Lễ hội âm nhạc dành cho giới trẻ</h1>',
			heroImageUrl:
				'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=1200&auto=format&fit=crop', // Placeholder
			seatMapUrl: 'https://res.cloudinary.com/dts1ofmtk/image/upload/v1731633519/seatmap-atsh.png',
			organizerId: datVietVac.id,
			venueId: svdQuanKhu7.id,
			status: 'PUBLISHED',
			artists: {
				create: [
					{ artistId: mono.id, role: 'Ca sĩ chính' },
					{ artistId: tlinh.id, role: 'Rapper' },
					{ artistId: phuongMyChi.id, role: 'Ca sĩ chính' },
				],
			},
		},
	})

	const emxinhShow = await prisma.concertShow.create({
		data: {
			concertId: emxinhConcert.id,
			startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
			salesOpensAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
		},
	})
	await createVenueSeatsAndTickets(svdQuanKhu7.id, emxinhShow.id, emxinhConcert.id)

	console.log(
		'Seed data inserted successfully! Included 4 concerts with SVIP, VIP, CAT1, CAT2, GA.',
	)
}

main()
	.catch((e) => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

