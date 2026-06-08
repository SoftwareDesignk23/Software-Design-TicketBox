import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import type { Role } from '../auth/auth.types.js'

@Injectable()
export class AdminService {
	constructor(private readonly prisma: PrismaService) {}

	async getStats(userId: string, role: Role) {
		const isSuperAdmin = role === 'ADMIN'
		
		const paidBookings = await this.prisma.booking.findMany({
			where: {
				status: 'PAID',
				...(isSuperAdmin ? {} : {
					items: {
						some: {
							ticketType: {
								concert: {
									organizerId: userId
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
							organizerId: userId
						}
					}
				})
			}
		})

		const activeConcertsCount = await this.prisma.concert.count({
			where: {
				status: 'PUBLISHED',
				...(isSuperAdmin ? {} : { organizerId: userId })
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

		return this.prisma.concert.findMany({
			where: isSuperAdmin ? {} : { organizerId: userId },
			select: {
				id: true,
				title: true,
				status: true,
				createdAt: true,
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
}
