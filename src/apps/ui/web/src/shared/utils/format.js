export function formatCurrency(value) {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'VND',
		maximumFractionDigits: 0,
	}).format(value)
}

export function formatDateRange(start, end) {
	const formatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
	})
	const startText = formatter.format(new Date(start))
	const endText = formatter.format(new Date(end))
	return `${startText} - ${endText}`
}

export function formatLongDate(date) {
	return new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	}).format(new Date(date))
}

export function formatTime(date) {
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: '2-digit',
	}).format(new Date(date))
}
