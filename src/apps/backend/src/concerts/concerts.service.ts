import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import { createConcertSchema, updateConcertSchema, createTicketTypeSchema, updateTicketTypeSchema, createShowSchema, assignArtistSchema } from './concerts.dto.js'
import type { Role } from '../auth/auth.types.js'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'
import { RedisService } from '../redis/redis.service.js'
import { ConfigService } from '@nestjs/config'

const concertResponseSelect = {
	id: true,
	title: true,
	description: true,
	status: true,
	heroImageUrl: true,
	seatMapUrl: true,
	bannerUrl: true,
	venue: {
		select: {
			id: true,
			name: true,
			address: true,
			mapUrl: true,
			capacity: true,
		}
	},
	organizer: {
		select: {
			id: true,
			name: true,
			logoUrl: true,
			description: true,
		},
	},
	shows: {
		select: {
			id: true,
			startsAt: true,
			endsAt: true,
			salesOpensAt: true,
			status: true,
		},
		orderBy: {
			startsAt: 'asc' as const,
		}
	},
	artists: {
		select: {
			role: true,
			artist: {
				select: {
					id: true,
					name: true,
					avatarUrl: true,
					bio: true,
				}
			}
		}
	},
	sponsors: {
		select: {
			tier: true,
			sponsor: {
				select: {
					id: true,
					name: true,
					logoUrl: true,
				}
			}
		}
	},
	ticketTypes: {
		select: {
			id: true,
			name: true,
			price: true,
			totalQuantity: true,
			soldQuantity: true,
			maxPerOrder: true,
			colorCode: true,
			benefits: true,
			rows: true,
			seatsPerRow: true,
		}
	},
	gates: {
		select: {
			id: true,
			name: true,
			capacity: true,
			type: true,
		}
	}
} as const

@Injectable()
export class ConcertsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly config: ConfigService,
	) {}

	private get cacheTtl() {
		return parseInt(this.config.get<string>('CACHE_TTL') || '300', 10)
	}

	async listConcerts() {
		const cacheKey = 'concerts:list:published'
		const cached = await this.redis.get(cacheKey)
		if (cached) {
			return JSON.parse(cached)
		}

		const concerts = await this.prisma.concert.findMany({
			where: { status: 'PUBLISHED' },
			select: concertResponseSelect,
		})

		await this.redis.set(cacheKey, JSON.stringify(concerts), 'EX', this.cacheTtl)
		return concerts
	}

	async getConcertById(id: string) {
		const cacheKey = `concerts:detail:${id}`
		const cached = await this.redis.get(cacheKey)
		if (cached) {
			return JSON.parse(cached)
		}

		const concert = await this.prisma.concert.findFirst({
			where: {
				id,
				status: 'PUBLISHED',
			},
			select: concertResponseSelect,
		})

		if (!concert) {
			throw new AppException(ErrorCode.ConcertNotFound)
		}

		await this.redis.set(cacheKey, JSON.stringify(concert), 'EX', this.cacheTtl)
		return concert
	}

	async getShowSeats(showId: string) {
		const seats = await this.prisma.showSeat.findMany({
			where: { showId },
			include: {
				seat: {
					include: {
						section: true,
					}
				},
				ticketType: {
					select: {
						id: true,
						name: true,
						colorCode: true,
						price: true,
					}
				}
			},
			orderBy: [
				{ seat: { section: { sortOrder: 'asc' } } },
				{ seat: { row: 'asc' } },
				{ seat: { number: 'asc' } }
			]
		})

		const lockKeys = seats.map(s => `seat_lock:${s.id}`)
		if (lockKeys.length > 0) {
			const locks = await this.redis.mget(lockKeys)
			seats.forEach((seat, index) => {
				const lockedBy = locks[index]
				if (lockedBy) {
					;(seat as any).status = 'RESERVED'
					;(seat as any).lockedBy = lockedBy
				}
			})
		}

		return seats
	}

	async createConcert(body: unknown, userId: string, role: Role) {
		const result = createConcertSchema.safeParse(body)

		if (!result.success) {
			throw new AppException(ErrorCode.ConcertValidationFailed, {
				fields: result.error.flatten().fieldErrors,
			})
		}

		let organizerId = (body as any).organizerId
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (!user?.organizerId) {
				throw new AppException(ErrorCode.ConcertForbidden) // Not linked to an organizer
			}
			organizerId = user.organizerId
		}

		if (!organizerId) {
			throw new AppException(ErrorCode.ConcertValidationFailed, {
				fields: { organizerId: ['Required for ADMIN'] },
			})
		}

		const created = await this.prisma.concert.create({
			data: {
				...result.data,
				status: result.data.status ?? 'DRAFT',
				organizerId,
			},
			select: concertResponseSelect,
		})
		
		await this.redis.del('concerts:list:published')
		return created
	}

	async updateConcert(id: string, body: unknown, userId: string, role: Role) {
		const result = updateConcertSchema.safeParse(body)

		if (!result.success) {
			throw new AppException(ErrorCode.ConcertValidationFailed, {
				fields: result.error.flatten().fieldErrors,
			})
		}

		const concert = await this.prisma.concert.findUnique({
			where: { id },
			select: { id: true, organizerId: true },
		})

		if (!concert) {
			throw new AppException(ErrorCode.ConcertNotFound)
		}

		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) {
				throw new AppException(ErrorCode.ConcertForbidden)
			}
		}

		const updated = await this.prisma.concert.update({
			where: { id },
			data: result.data,
			select: concertResponseSelect,
		})

		await this.redis.del('concerts:list:published')
		await this.redis.del(`concerts:detail:${id}`)
		return updated
	}

	async deleteConcert(id: string, userId: string, role: Role) {
		const concert = await this.prisma.concert.findUnique({
			where: { id },
			select: { id: true, organizerId: true },
		})

		if (!concert) {
			throw new AppException(ErrorCode.ConcertNotFound)
		}

		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) {
				throw new AppException(ErrorCode.ConcertForbidden)
			}
		}

		await this.prisma.concert.delete({
			where: { id },
		})

		await this.redis.del('concerts:list:published')
		await this.redis.del(`concerts:detail:${id}`)

		return { deleted: true, id }
	}

	async createTicketType(concertId: string, body: unknown, userId: string, role: Role) {
		const result = createTicketTypeSchema.safeParse(body)
		if (!result.success) throw new AppException(ErrorCode.ConcertValidationFailed)

		const concert = await this.prisma.concert.findUnique({ where: { id: concertId }, select: { organizerId: true, venueId: true } })
		if (!concert) throw new AppException(ErrorCode.ConcertNotFound)
		
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) throw new AppException(ErrorCode.ConcertForbidden)
		}

		let finalTotalQuantity = result.data.totalQuantity;
		if (result.data.isSeated && result.data.rows && result.data.seatsPerRow) {
			finalTotalQuantity = result.data.rows * result.data.seatsPerRow;
		}

		const ticketType = await this.prisma.ticketType.create({
			data: { 
				name: result.data.name,
				price: result.data.price,
				totalQuantity: finalTotalQuantity || 1,
				colorCode: result.data.colorCode,
				maxPerOrder: result.data.maxPerOrder,
				rows: result.data.isSeated ? result.data.rows : null,
				seatsPerRow: result.data.isSeated ? result.data.seatsPerRow : null,
				concertId 
			}
		})

		if (result.data.isSeated && result.data.rows && result.data.seatsPerRow) {
			const sectionName = `Khu ${ticketType.name} - ${concertId}`;
			let section = await this.prisma.seatSection.findUnique({
				where: { venueId_name: { venueId: concert.venueId, name: sectionName } }
			});
			if (!section) {
				section = await this.prisma.seatSection.create({
					data: { venueId: concert.venueId, name: sectionName, capacity: finalTotalQuantity || 0 }
				});
			}

			// Generate seats based on rows and seatsPerRow
			const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			const getRowLabel = (index: number) => {
				if (index < 26) return alphabet[index];
				return alphabet[Math.floor(index / 26) - 1] + alphabet[index % 26];
			};

			const seatsData: any[] = [];
			for (let i = 0; i < result.data.rows; i++) {
				const rowLabel = getRowLabel(i);
				for (let j = 1; j <= result.data.seatsPerRow; j++) {
					seatsData.push({
						sectionId: section.id,
						label: `${rowLabel}${j}`,
						row: rowLabel,
						number: j
					});
				}
			}
			await this.prisma.seat.createMany({ data: seatsData, skipDuplicates: true });
			
			const seatsInDb = await this.prisma.seat.findMany({ where: { sectionId: section.id } });

			// Assign these seats to all EXISTING shows for this concert
			const existingShows = await this.prisma.concertShow.findMany({ where: { concertId } });
			for (const show of existingShows) {
				const showSeatsData = seatsInDb.map(seat => ({
					showId: show.id,
					seatId: seat.id,
					ticketTypeId: ticketType.id,
					status: 'AVAILABLE' as const,
				}));
				await this.prisma.showSeat.createMany({ data: showSeatsData, skipDuplicates: true });
			}
		}

		await this.redis.del(`concerts:detail:${concertId}`)
		return ticketType
	}

	async deleteTicketType(concertId: string, ticketTypeId: string, userId: string, role: Role) {
		const concert = await this.prisma.concert.findUnique({ where: { id: concertId }, select: { organizerId: true, venueId: true } })
		if (!concert) throw new AppException(ErrorCode.ConcertNotFound)
		
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) throw new AppException(ErrorCode.ConcertForbidden)
		}

		const ticketType = await this.prisma.ticketType.findUnique({ where: { id: ticketTypeId } })
		if (!ticketType) return { deleted: false }

		if (ticketType.soldQuantity > 0) {
			throw new AppException(ErrorCode.ConcertValidationFailed, { reason: 'cannot_delete_ticket_with_sales' })
		}

		// Delete related ShowSeats
		await this.prisma.showSeat.deleteMany({
			where: { ticketTypeId }
		})

		// Delete related SeatSection if it was a seated section
		if (ticketType.rows && ticketType.seatsPerRow) {
			const sectionName = `Khu ${ticketType.name} - ${concertId}`;
			await this.prisma.seatSection.deleteMany({
				where: { venueId: concert.venueId, name: sectionName }
			});
		}

		await this.prisma.ticketType.delete({ where: { id: ticketTypeId } })
		await this.redis.del(`concerts:detail:${concertId}`)
		return { deleted: true }
	}

	async updateTicketType(concertId: string, ticketTypeId: string, body: unknown, userId: string, role: Role) {
		const result = updateTicketTypeSchema.safeParse(body)
		if (!result.success) throw new AppException(ErrorCode.ConcertValidationFailed)

		const concert = await this.prisma.concert.findUnique({ where: { id: concertId }, select: { organizerId: true, venueId: true } })
		if (!concert) throw new AppException(ErrorCode.ConcertNotFound)
		
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) throw new AppException(ErrorCode.ConcertForbidden)
		}

		const existingTT = await this.prisma.ticketType.findUnique({ where: { id: ticketTypeId } })
		if (!existingTT) throw new AppException(ErrorCode.ConcertNotFound)

		let finalTotalQuantity = result.data.totalQuantity
		if (result.data.isSeated && result.data.rows && result.data.seatsPerRow) {
			finalTotalQuantity = result.data.rows * result.data.seatsPerRow
			
			if (existingTT.rows !== result.data.rows || existingTT.seatsPerRow !== result.data.seatsPerRow) {
				if (existingTT.soldQuantity > 0) {
					throw new AppException(ErrorCode.ConcertValidationFailed, { reason: 'cannot_change_seats_with_sales' })
				}
				
				const sectionName = `Khu ${result.data.name || existingTT.name} - ${concertId}`;
				let section = await this.prisma.seatSection.findUnique({
					where: { venueId_name: { venueId: concert.venueId, name: sectionName } }
				});
				if (!section) {
					section = await this.prisma.seatSection.create({
						data: { venueId: concert.venueId, name: sectionName, capacity: finalTotalQuantity }
					});
				} else {
				    await this.prisma.seatSection.update({
				        where: { id: section.id },
				        data: { capacity: finalTotalQuantity }
				    });
				}

				await this.prisma.seat.deleteMany({ where: { sectionId: section.id } })

				const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
				const getRowLabel = (index: number) => {
					if (index < 26) return alphabet[index];
					return alphabet[Math.floor(index / 26) - 1] + alphabet[index % 26];
				};

				const seatsData: any[] = [];
				for (let i = 0; i < result.data.rows; i++) {
					const rowLabel = getRowLabel(i);
					for (let j = 1; j <= result.data.seatsPerRow; j++) {
						seatsData.push({
							sectionId: section.id,
							label: `${rowLabel}${j}`,
							row: rowLabel,
							number: j
						});
					}
				}
				await this.prisma.seat.createMany({ data: seatsData, skipDuplicates: true });
				
				const seatsInDb = await this.prisma.seat.findMany({ where: { sectionId: section.id } });

				const existingShows = await this.prisma.concertShow.findMany({ where: { concertId } });
				for (const show of existingShows) {
					const showSeatsData = seatsInDb.map(seat => ({
						showId: show.id,
						seatId: seat.id,
						ticketTypeId: ticketTypeId,
						status: 'AVAILABLE' as const,
					}));
					await this.prisma.showSeat.createMany({ data: showSeatsData, skipDuplicates: true });
				}
			}
		}

		const { isSeated, ...updateData } = result.data;
		const ticketType = await this.prisma.ticketType.update({
			where: { id: ticketTypeId },
			data: {
				...updateData,
				totalQuantity: finalTotalQuantity,
				rows: result.data.isSeated ? result.data.rows : existingTT.rows,
				seatsPerRow: result.data.isSeated ? result.data.seatsPerRow : existingTT.seatsPerRow,
			}
		})
		await this.redis.del(`concerts:detail:${concertId}`)
		return ticketType
	}

	async createShow(concertId: string, body: unknown, userId: string, role: Role) {
		const result = createShowSchema.safeParse(body)
		if (!result.success) throw new AppException(ErrorCode.ConcertValidationFailed)

		const concert = await this.prisma.concert.findUnique({ where: { id: concertId }, select: { organizerId: true, venueId: true } })
		if (!concert) throw new AppException(ErrorCode.ConcertNotFound)
		
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) throw new AppException(ErrorCode.ConcertForbidden)
		}

		const show = await this.prisma.concertShow.create({
			data: { ...result.data, concertId }
		})

		// Generate ShowSeats for all existing TicketTypes that are seated
		const ticketTypes = await this.prisma.ticketType.findMany({ where: { concertId } });
		for (const tt of ticketTypes) {
			const sectionName = `Khu ${tt.name} - ${concertId}`;
			const section = await this.prisma.seatSection.findUnique({
				where: { venueId_name: { venueId: concert.venueId, name: sectionName } }
			});
			if (section) {
				const seats = await this.prisma.seat.findMany({ where: { sectionId: section.id } });
				if (seats.length > 0) {
					const showSeatsData = seats.map(seat => ({
						showId: show.id,
						seatId: seat.id,
						ticketTypeId: tt.id,
						status: 'AVAILABLE' as const,
					}));
					await this.prisma.showSeat.createMany({ data: showSeatsData, skipDuplicates: true });
				}
			}
		}

		await this.redis.del(`concerts:detail:${concertId}`)
		return show
	}

	async assignArtist(concertId: string, body: unknown, userId: string, role: Role) {
		const result = assignArtistSchema.safeParse(body)
		if (!result.success) throw new AppException(ErrorCode.ConcertValidationFailed)

		const concert = await this.prisma.concert.findUnique({ where: { id: concertId }, select: { organizerId: true } })
		if (!concert) throw new AppException(ErrorCode.ConcertNotFound)
		
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) throw new AppException(ErrorCode.ConcertForbidden)
		}

		const existingAssignment = await this.prisma.concertArtist.findUnique({
			where: { concertId_artistId: { concertId, artistId: result.data.artistId } }
		})

		if (existingAssignment) {
			throw new AppException(ErrorCode.ConcertValidationFailed, { reason: 'Nghệ sĩ này đã được thêm vào sự kiện' })
		}

		const artistAssignment = await this.prisma.concertArtist.create({
			data: {
				concertId,
				artistId: result.data.artistId,
				role: result.data.role
			}
		})
		await this.redis.del(`concerts:detail:${concertId}`)
		return artistAssignment
	}

	async removeArtist(concertId: string, artistId: string, userId: string, role: Role) {
		const concert = await this.prisma.concert.findUnique({ where: { id: concertId }, select: { organizerId: true } })
		if (!concert) throw new AppException(ErrorCode.ConcertNotFound)
		
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) throw new AppException(ErrorCode.ConcertForbidden)
		}

		await this.prisma.concertArtist.delete({
			where: {
				concertId_artistId: { concertId, artistId }
			}
		})
		await this.redis.del(`concerts:detail:${concertId}`)
		return { deleted: true }
	}

	async getConcertGates(concertId: string) {
		const gates = await this.prisma.gate.findMany({
			where: { concertId },
			orderBy: { name: 'asc' }
		})
		return gates
	}

	async updateConcertGates(concertId: string, body: unknown, userId: string, role: Role) {
		const { updateConcertGatesSchema } = await import('./concerts.dto.js')
		const result = updateConcertGatesSchema.safeParse(body)
		if (!result.success) throw new AppException(ErrorCode.ConcertValidationFailed)

		const concert = await this.prisma.concert.findUnique({ where: { id: concertId }, select: { organizerId: true } })
		if (!concert) throw new AppException(ErrorCode.ConcertNotFound)
		
		if (role !== 'ADMIN') {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (concert.organizerId !== user?.organizerId) throw new AppException(ErrorCode.ConcertForbidden)
		}

		// Delete existing gates and recreate
		// Since Ticket relies on GateId, wait, if we delete Gates, Tickets that referenced them will be SetNull
		// A better way is to update existing ones if they match by name, and create/delete others.
		// However, for simplicity, if tickets are already assigned, dropping the gate will lose the ticket's gate assignment.
		// Since gates usually aren't modified after ticket sales, or if they are, it's fine to reassign.
		// To be perfectly safe, upsert by name.
		
		const currentGates = await this.prisma.gate.findMany({ where: { concertId } })
		const incomingNames = result.data.gates.map(g => g.name)
		
		const toDelete = currentGates.filter(g => !incomingNames.includes(g.name))
		if (toDelete.length > 0) {
			await this.prisma.gate.deleteMany({
				where: { id: { in: toDelete.map(g => g.id) } }
			})
		}

		const updatedGates: any[] = []
		for (const g of result.data.gates) {
			const existing = currentGates.find(cg => cg.name === g.name)
			if (existing) {
				const updated = await this.prisma.gate.update({
					where: { id: existing.id },
					data: { capacity: g.capacity, type: g.type }
				})
				updatedGates.push(updated)
			} else {
				const created = await this.prisma.gate.create({
					data: { concertId, name: g.name, capacity: g.capacity, type: g.type }
				})
				updatedGates.push(created)
			}
		}

		await this.redis.del(`concerts:detail:${concertId}`)
		return updatedGates
	}
}
