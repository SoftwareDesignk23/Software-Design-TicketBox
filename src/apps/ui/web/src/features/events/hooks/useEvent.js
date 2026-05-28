import { useQuery } from '@tanstack/react-query'
import { fetchEventById } from '../../../shared/services/mockApi'

export function useEvent(eventId) {
	return useQuery({
		queryKey: ['events', eventId],
		queryFn: () => fetchEventById(eventId),
		enabled: Boolean(eventId),
	})
}
