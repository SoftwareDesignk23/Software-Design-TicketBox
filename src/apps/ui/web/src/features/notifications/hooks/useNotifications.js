import { useQuery } from '@tanstack/react-query'
import { fetchNotifications } from '../../../shared/services/mockApi'

export function useNotifications() {
	return useQuery({
		queryKey: ['notifications'],
		queryFn: fetchNotifications,
	})
}
