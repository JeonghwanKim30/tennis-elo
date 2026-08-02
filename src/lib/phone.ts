export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function lastFourDigits(phoneDigits: string): string {
  return phoneDigits.slice(-4);
}

export function formatPhone(phoneDigits: string): string {
  if (phoneDigits.length === 11) {
    return `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 7)}-${phoneDigits.slice(7)}`;
  }
  if (phoneDigits.length === 10) {
    return `${phoneDigits.slice(0, 3)}-${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`;
  }
  return phoneDigits;
}
