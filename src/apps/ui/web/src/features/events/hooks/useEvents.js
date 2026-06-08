import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '../../../shared/services/api'

export function useEvents() {
	return useQuery({
		queryKey: ['events'],
		queryFn: fetchEvents,
	})
}
