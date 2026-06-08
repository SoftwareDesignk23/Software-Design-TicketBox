import {
	WebSocketGateway,
	WebSocketServer,
	SubscribeMessage,
	MessageBody,
	ConnectedSocket,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Injectable, Logger } from '@nestjs/common'

@Injectable()
@WebSocketGateway({
	cors: {
		origin: '*', // For demo purposes
	},
	namespace: '/seats',
})
export class SeatGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(SeatGateway.name)

	@WebSocketServer()
	server: Server

	handleConnection(client: Socket) {
		this.logger.log(`Client connected: ${client.id}`)
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected: ${client.id}`)
	}

	@SubscribeMessage('join_show')
	handleJoinShow(
		@MessageBody() data: { showId: string },
		@ConnectedSocket() client: Socket,
	) {
		const room = `show_${data.showId}`
		client.join(room)
		this.logger.log(`Client ${client.id} joined room ${room}`)
		return { event: 'joined', data: room }
	}

	@SubscribeMessage('leave_show')
	handleLeaveShow(
		@MessageBody() data: { showId: string },
		@ConnectedSocket() client: Socket,
	) {
		const room = `show_${data.showId}`
		client.leave(room)
		this.logger.log(`Client ${client.id} left room ${room}`)
		return { event: 'left', data: room }
	}

	// This method will be called by BookingService to broadcast changes
	notifySeatUpdate(showId: string, seatUpdates: Array<{ showSeatId: string, status: string, lockedBy?: string }>) {
		const room = `show_${showId}`
		this.server.to(room).emit('seats_updated', seatUpdates)
		this.logger.log(`Emitted seats_updated to room ${room} for ${seatUpdates.length} seats`)
	}
}
