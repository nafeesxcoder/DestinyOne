export const isValidPhone = (value: string) => value.replace(/\D/g, '').length >= 10;
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
export const isValidPassword = (value: string) => value.length >= 8;
export const isEligibleMemberAge = (value: string, min = 25, max = 35) => {
  const age = Number(value.replace(/\D/g, ''));
  return Number.isInteger(age) && age >= min && age <= max;
};
