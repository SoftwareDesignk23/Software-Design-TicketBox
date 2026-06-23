import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { Role } from '../auth/auth.types.js'
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'

@Injectable()
export class AdminService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly amqpConnection: AmqpConnection
	) {}

	async getStats(userId: string, role: Role) {
		const isSuperAdmin = role === 'ADMIN'
		
		let userOrganizerId: string | undefined = undefined;
		if (!isSuperAdmin) {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (user?.organizerId) {
				userOrganizerId = user.organizerId
			} else {
				// If somehow an organizer has no linked organizer profile, return 0
				return { totalRevenue: 0, totalTicketsSold: 0, activeConcerts: 0 }
			}
		}

		const paidBookings = await this.prisma.booking.findMany({
			where: {
				status: 'PAID',
				...(isSuperAdmin ? {} : {
					items: {
						some: {
							ticketType: {
								concert: {
									organizerId: userOrganizerId
								}
							}
						}
					}
				})
			},
			select: {
				totalAmount: true,
			}
		})

		const totalRevenue = paidBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0)

		const ticketsSold = await this.prisma.ticket.count({
			where: {
				status: 'ISSUED', // or CHECKED_IN
				...(isSuperAdmin ? {} : {
					show: {
						concert: {
							organizerId: userOrganizerId
						}
					}
				})
			}
		})

		const activeConcertsCount = await this.prisma.concert.count({
			where: {
				status: 'PUBLISHED',
				...(isSuperAdmin ? {} : { organizerId: userOrganizerId })
			}
		})

		return {
			totalRevenue,
			totalTicketsSold: ticketsSold,
			activeConcerts: activeConcertsCount,
		}
	}

	async listConcerts(userId: string, role: Role) {
		const isSuperAdmin = role === 'ADMIN'
		
		let userOrganizerId: string | undefined = undefined;
		if (!isSuperAdmin) {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (user?.organizerId) {
				userOrganizerId = user.organizerId
			} else {
				return []
			}
		}

		return this.prisma.concert.findMany({
			where: isSuperAdmin ? {} : { organizerId: userOrganizerId },
			select: {
				id: true,
				title: true,
				description: true,
				heroImageUrl: true,
				seatMapUrl: true,
				status: true,
				createdAt: true,
				venue: {
					select: {
						id: true,
						name: true,
					}
				},
				ticketTypes: {
					select: {
						id: true,
						name: true,
						price: true,
						totalQuantity: true,
						soldQuantity: true,
					}
				},
				shows: {
					select: {
						id: true,
						startsAt: true,
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		})
	}

	async listJobs(userId: string, role: Role) {
		return this.prisma.backgroundJob.findMany({
			where: role === 'ADMIN' ? {} : { createdBy: userId },
			orderBy: { createdAt: 'desc' },
			take: 20
		})
	}

	async getJobStatus(jobId: string) {
		const job = await this.prisma.backgroundJob.findUnique({ where: { id: jobId } })
		if (!job) return null
		return {
			id: job.id,
			status: job.status,
			type: job.type,
			result: job.result,
			createdAt: job.createdAt
		}
	}

	async getShowGuests(showId: string) {
		const tickets = await this.prisma.ticket.findMany({
			where: {
				showId,
				owner: {
					passwordHash: 'guest-no-login'
				}
			},
			include: {
				owner: true,
				showSeat: {
					include: { seat: true }
				},
				gate: true
			},
			orderBy: {
				issuedAt: 'desc'
			}
		});

		return tickets.map(ticket => {
			const seat = ticket.showSeat?.seat;
			const seatLabel = seat ? (seat.row ? `${seat.row}${seat.number}` : seat.label) : 'N/A';
			return {
				id: ticket.id,
				name: ticket.owner.displayName,
				email: ticket.owner.email,
				phone: ticket.owner.phoneNumber,
				seat: seatLabel,
				gate: ticket.gate?.name || 'Chưa phân cổng',
				status: ticket.checkedInAt ? 'CHECKED_IN' : 'ISSUED',
				checkedInAt: ticket.checkedInAt
			};
		});
	}

	async runJob(jobId: string) {
		const job = await this.prisma.backgroundJob.findUnique({ where: { id: jobId } })
		if (!job) throw new AppException(ErrorCode.ValidationFailed, { reason: 'job_not_found' })
		
		if (job.status !== 'PENDING') {
			throw new AppException(ErrorCode.ValidationFailed, { reason: 'job_not_pending' })
		}

		if (job.type === 'CSV_GUEST_LIST') {
			// Publish to queue to run it in background immediately (re-using worker logic)
			// OR we can just call it inline and return immediately.
			// Let's publish to rabbitmq to utilize the existing worker.
			await this.amqpConnection.publish('ticketbox.exchange', 'job.csv.import', {
				jobId: job.id
			});
			return { message: 'Job triggered successfully', jobId };
		}

		throw new AppException(ErrorCode.ValidationFailed, { reason: 'unsupported_job_type' })
	}

	async listArtists(userId: string, role: Role) {
		const isSuperAdmin = role === 'ADMIN'
		
		let userOrganizerId: string | undefined = undefined;
		if (!isSuperAdmin) {
			const user = await this.prisma.user.findUnique({ where: { id: userId } })
			if (user?.organizerId) {
				userOrganizerId = user.organizerId
			} else {
				return []
			}
		}

		return this.prisma.artist.findMany({
			where: isSuperAdmin ? {} : {
				concerts: {
					some: {
						concert: {
							organizerId: userOrganizerId
						}
					}
				}
			},
			orderBy: { name: 'asc' }
		})
	}

	async updateArtist(artistId: string, data: { name?: string, bio?: string, avatarUrl?: string }) {
		return this.prisma.artist.update({
			where: { id: artistId },
			data: {
				...(data.name && { name: data.name }),
				...(data.bio !== undefined && { bio: data.bio }),
				...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
			}
		})
	}

	async deleteArtist(id: string) {
		try {
			// Prisma automatically cascades deletion to ConcertArtist due to onDelete: Cascade
			const artist = await this.prisma.artist.delete({
				where: { id }
			})
			return { success: true, artist }
		} catch (error: any) {
			if (error.code === 'P2025') {
				throw new NotFoundException('Nghệ sĩ không tồn tại hoặc đã bị xóa')
			}
			throw error
		}
	}

	async listVenues() {
		return this.prisma.venue.findMany({
			orderBy: { name: 'asc' }
		})
	}

	async createVenue(data: { name: string, address: string, capacity?: number }) {
		return this.prisma.venue.create({
			data: {
				name: data.name,
				address: data.address,
				capacity: data.capacity || 1000,
			}
		})
	}
}
