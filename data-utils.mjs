export function safeColor(value) {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : '#6878ef';
}
