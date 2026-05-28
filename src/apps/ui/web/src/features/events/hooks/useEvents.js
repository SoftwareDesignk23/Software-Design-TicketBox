import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '../../../shared/services/mockApi'

export function useEvents() {
	return useQuery({
		queryKey: ['events'],
		queryFn: fetchEvents,
	})
}
