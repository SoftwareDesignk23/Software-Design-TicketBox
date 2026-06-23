import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service.js'
import bcrypt from 'bcryptjs'
import { AppException } from '../exception/app-exception.js'
import { ErrorCode } from '../exception/error-code.js'

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) {}

	async listOrganizers() {
		const users = await this.prisma.user.findMany({
			where: { role: 'ORGANIZER' },
			include: {
				organizer: {
					include: {
						_count: {
							select: { concerts: true }
						}
					}
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		const now = new Date()
		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

		return Promise.all(users.map(async (u) => {
			if (!u.organizerId) return u

			const bookings = await this.prisma.booking.findMany({
				where: {
					status: 'PAID',
					createdAt: { gte: startOfMonth },
					items: {
						some: {
							ticketType: {
								concert: {
									organizerId: u.organizerId
								}
							}
						}
					}
				},
				select: { totalAmount: true }
			})

			const monthlyRevenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0)

			return {
				...u,
				organizer: {
					...u.organizer,
					concertsCount: u.organizer?._count?.concerts || 0,
					monthlyRevenue
				}
			}
		}))
	}

	async listStaff(creatorId: string, creatorRole: string) {
		let whereClause: any = { role: 'CHECK_IN_STAFF' };
		if (creatorRole === 'ORGANIZER') {
			const creator = await this.prisma.user.findUnique({ where: { id: creatorId } });
			if (!creator?.organizerId) return [];
			whereClause.organizerId = creator.organizerId;
		}
		return this.prisma.user.findMany({
			where: whereClause,
			include: { organizer: true },
			orderBy: { createdAt: 'desc' },
		})
	}

	async createOrganizer(data: {
		email: string
		password?: string
		displayName: string
		phoneNumber?: string
		organizerName: string
		organizerWebsite?: string
		organizerDescription?: string
	}) {
		const passwordHash = data.password
			? await bcrypt.hash(data.password, 10)
			: await bcrypt.hash('123456', 10)

		// Create Organizer profile
		const organizer = await this.prisma.organizer.create({
			data: {
				name: data.organizerName,
				website: data.organizerWebsite,
				description: data.organizerDescription,
			},
		})

		// Create User and link to Organizer
		try {
			return await this.prisma.user.create({
				data: {
					email: data.email,
					passwordHash,
					displayName: data.displayName,
					phoneNumber: data.phoneNumber,
					role: 'ORGANIZER',
					organizerId: organizer.id,
				},
				include: { organizer: true },
			})
		} catch (error: any) {
			if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
				throw new AppException(ErrorCode.ValidationFailed, {
					fields: { email: ['Email này đã được sử dụng.'] }
				})
			}
			throw new AppException(ErrorCode.ValidationFailed, {
				fields: { server_error: [error.message, error.stack] }
			})
		}
	}

	async updateOrganizerStatus(id: string, active: boolean) {
		return this.prisma.user.update({
			where: { id },
			data: {
				isActive: active
			},
		})
	}

	async deleteOrganizer(id: string) {
		const user = await this.prisma.user.findUnique({ where: { id } })
		if (!user) throw new NotFoundException('User not found')

		await this.prisma.user.delete({ where: { id } })

		if (user.organizerId) {
			// Delete the organizer profile as well if it has no more users
			const count = await this.prisma.user.count({ where: { organizerId: user.organizerId } })
			if (count === 0) {
				await this.prisma.organizer.delete({ where: { id: user.organizerId } })
			}
		}

		return { success: true }
	}
}
