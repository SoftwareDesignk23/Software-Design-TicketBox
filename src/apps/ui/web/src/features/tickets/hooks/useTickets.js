import { useQuery } from '@tanstack/react-query'
import { fetchTickets } from '../../../shared/services/mockApi'

export function useTickets() {
	return useQuery({
		queryKey: ['tickets'],
		queryFn: fetchTickets,
	})
}
