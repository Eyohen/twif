import { API_BASE_URL } from '../../lib/api';

export const stockStatus = (item) => {
  const quantity = Number(item?.quantity || 0);
  if (quantity <= 0) return 'Out of Stock';
  return quantity <= Number(item?.lowStockThreshold || 0) ? 'Low Stock' : 'In Stock';
};

// The photo lives behind its own endpoint rather than in the list payload, so
// opening inventory does not download every picture in the shop at once.
export const itemImageUrl = (item) => (item?.hasImage ? `${API_BASE_URL}/oms/fabrics/${item.id}/image` : '');

const COLOUR_SWATCHES = {
  black: '#1a1611', white: '#f5f5f5', navy: '#193454', 'navy blue': '#193454', green: '#2a5a2a',
  cream: '#f5f0e0', burgundy: '#6b1a1a', beige: '#d4c9a8', grey: '#8a8a8a', gray: '#8a8a8a',
  blue: '#1767df', red: '#c0392b', brown: '#7a4a2a', gold: '#c9a227', pink: '#d98ca6',
};

// A dot beside the colour name. Unknown colours get a neutral swatch rather
// than a wrong one.
export const colourSwatch = (colour = '') => {
  const key = String(colour).toLowerCase().trim();
  return COLOUR_SWATCHES[key] || COLOUR_SWATCHES[key.split(' ').pop()] || '#b0a090';
};
