export function dateString(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const dayFormat = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
const monthFormat = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' });
const moneyFormat = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });
export function dateLabel(value: string, relative = true) {
  const today = dateString(), yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (relative && value === today) return 'Today';
  if (relative && value === dateString(yesterday)) return 'Yesterday';
  return dayFormat.format(new Date(value + 'T12:00:00'));
}
export function monthLabel(month: string) { return monthFormat.format(new Date(month + '-01T12:00:00')); }
export function money(value: number, signed = false) { return `${signed && value > 0 ? '+' : ''}${moneyFormat.format(value)}`; }
