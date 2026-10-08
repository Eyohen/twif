export const PHONE_DIGITS = 11;

export const phoneDigits = (value = '') => String(value).replace(/\D/g, '').slice(0, PHONE_DIGITS);

export const isValidPhone = (value) => new RegExp(`^\\d{${PHONE_DIGITS}}$`).test(String(value || ''));

export const PHONE_ERROR = 'Phone number must contain exactly 11 digits.';
