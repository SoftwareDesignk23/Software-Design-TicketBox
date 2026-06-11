export const venueMapQuery = (venue) =>
  [venue?.name, venue?.address].filter(Boolean).join(' ').trim()

export const googleMapsSearchUrl = (query) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

export const openGoogleMapsSearch = (query, onMissingQuery) => {
  const normalizedQuery = String(query || '').trim()

  if (!normalizedQuery) {
    onMissingQuery?.()
    return
  }

  window.open(googleMapsSearchUrl(normalizedQuery), '_blank', 'noopener,noreferrer')
}
