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
	namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
	private readonly logger = new Logger(NotificationGateway.name)

	@WebSocketServer()
	server: Server

	handleConnection(client: Socket) {
		this.logger.log(`Client connected to notifications: ${client.id}`)
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`Client disconnected from notifications: ${client.id}`)
	}

	@SubscribeMessage('join_user_room')
	handleJoinUserRoom(
		@MessageBody() data: { userId: string },
		@ConnectedSocket() client: Socket,
	) {
		const room = `user_${data.userId}`
		client.join(room)
		this.logger.log(`Client ${client.id} joined notification room ${room}`)
		return { event: 'joined', data: room }
	}

	notifyNewNotification(userId: string, payload: any) {
		const room = `user_${userId}`
		this.server.to(room).emit('new_notification', payload)
		this.logger.log(`Emitted new_notification to room ${room}`)
	}
}
