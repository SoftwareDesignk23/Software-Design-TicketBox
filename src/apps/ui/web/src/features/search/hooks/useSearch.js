import { useMemo } from 'react'
import { useEvents } from '../../events/hooks/useEvents'

export function useSearch(query) {
	const { data, isLoading } = useEvents()

	const results = useMemo(() => {
		if (!data) return []
		const normalized = query.trim().toLowerCase()
		if (!normalized) return []
		return data.filter((event) => event.title.toLowerCase().includes(normalized))
	}, [data, query])

	return { results, isLoading }
}
