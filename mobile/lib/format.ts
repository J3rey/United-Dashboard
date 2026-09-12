export function dateString(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function dateLabel(value: string, relative = true) {
  const today = dateString(), yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (relative && value === today) return 'Today';
  if (relative && value === dateString(yesterday)) return 'Yesterday';
  return new Date(value + 'T12:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}
export function monthLabel(month: string) { return new Date(month + '-01T12:00:00').toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }); }
export function money(value: number, signed = false) { return `${signed && value > 0 ? '+' : ''}${new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)}`; }
