export const normalizeAuthPhone = (value: string) => {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (trimmed.startsWith('+') && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
};

export const isValidPhone = (value: string) => normalizeAuthPhone(value) !== null;
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isValidPassword = (value: string) => value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
export const isEligibleMemberAge = (value: string, min = 25, max = 35) => {
  const age = Number(value.replace(/\D/g, ''));
  return Number.isInteger(age) && age >= min && age <= max;
};
