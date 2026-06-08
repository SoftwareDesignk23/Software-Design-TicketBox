import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, API_URL } from '../../../shared/services/api'
import { useAuthStore } from '../../../shared/stores/authStore'
import { io } from 'socket.io-client'

export function useNotifications() {
	const { user } = useAuthStore()
	const queryClient = useQueryClient()

	useEffect(() => {
		if (!user?.id) return

		const socketUrl = API_URL.replace('/api/v1', '')
		const socket = io(`${socketUrl}/notifications`, {
			reconnectionAttempts: 3,
			reconnectionDelay: 2000,
			autoConnect: true
		})

		socket.on('connect', () => {
			console.log('Connected to notifications')
			socket.emit('join_user_room', { userId: user.id })
		})

		socket.on('new_notification', (payload) => {
			// Invalidate the query to fetch new data immediately
			queryClient.invalidateQueries(['notifications'])
		})

		return () => {
			socket.disconnect()
		}
	}, [user?.id, queryClient])

	return useQuery({
		queryKey: ['notifications'],
		queryFn: fetchNotifications,
		refetchInterval: 30000, // Poll every 30s for soft consistency
		staleTime: 10000,
		select: (data) => {
			return data.map((n) => ({
				id: n.id,
				type: n.type,
				payload: n.payload,
				title: n.type.replace(/_/g, ' '),
				body: n.payload?.message || 'You have a new notification',
				time: new Date(n.createdAt).toLocaleDateString(),
				isRead: n.isRead,
				unread: !n.isRead,
			}))
		}
	})
}
