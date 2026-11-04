export const PHONE_MAX_LENGTH = 16;
export const PHONE_PATTERN = '(?:0[0-9]{10}|\\+[1-9][0-9]{6,14})';

// Keep the long-standing helper name because it is shared by sign-in, staff,
// customers and invoices. It now preserves one leading `+` for international
// E.164 numbers while still removing spaces, brackets and hyphens as typed.
export const phoneDigits = (value = '') => {
  const text = String(value);
  const international = text.trimStart().startsWith('+');
  const digits = text.replace(/\D/g, '').slice(0, international ? 15 : 11);
  return international ? `+${digits}` : digits;
};

export const isValidPhone = (value) => new RegExp(`^${PHONE_PATTERN}$`).test(String(value || '').trim());

export const PHONE_ERROR = 'Enter an 11-digit Nigerian number or an international number beginning with + and its country code.';
