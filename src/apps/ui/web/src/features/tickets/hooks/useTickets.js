import { useQuery } from '@tanstack/react-query'
import { fetchTickets } from '../../../shared/services/api'

export function useTickets() {
	return useQuery({
		queryKey: ['tickets'],
		queryFn: fetchTickets,
	})
}
