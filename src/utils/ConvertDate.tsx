export function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short'
    })
}