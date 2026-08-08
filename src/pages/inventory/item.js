import { API_BASE_URL } from '../../lib/api';

export const stockStatus = (item) => {
  const quantity = Number(item?.quantity || 0);
  if (quantity <= 0) return 'Out of Stock';
  return quantity <= Number(item?.lowStockThreshold || 0) ? 'Low Stock' : 'In Stock';
};

// The photo lives behind its own endpoint rather than in the list payload, so
// opening inventory does not download every picture in the shop at once.
export const itemPhotoUrl = (item) => (item?.hasImage ? `${API_BASE_URL}/oms/fabrics/${item.id}/image` : '');

// Items added before photos existed have none, which left the list a column of
// empty grey squares. Each type falls back to a stock picture of that kind of
// material — it is not a photograph of this particular roll or box, so anywhere
// it stands in for a real photo says so.
const TYPE_PLACEHOLDERS = {
  fabric: '/inventory/fabric.webp',
  linings: '/inventory/linings.webp',
  lining: '/inventory/linings.webp',
  buttons: '/inventory/buttons.webp',
  button: '/inventory/buttons.webp',
  'sewing material': '/inventory/sewing-material.webp',
  'packaging materials': '/inventory/packaging-materials.webp',
  accessories: '/inventory/accessories.webp',
};

const GENERAL_PLACEHOLDER = '/inventory/general.webp';

export const itemPlaceholderUrl = (item) => {
  const key = String(item?.type || '').toLowerCase().trim();
  if (TYPE_PLACEHOLDERS[key]) return TYPE_PLACEHOLDERS[key];

  // Types the shop has added itself, and the garment names inventory was filed
  // under before, are matched on the word they contain.
  const match = Object.keys(TYPE_PLACEHOLDERS).find((name) => key.includes(name));
  if (match) return TYPE_PLACEHOLDERS[match];
  if (/cloth|wool|cotton|linen|silk|satin|suiting|shirting|dress|native|bridal|casual|jacket|trouser/.test(key)) {
    return TYPE_PLACEHOLDERS.fabric;
  }
  if (/zip|trim|thread|needle|pin/.test(key)) return TYPE_PLACEHOLDERS['sewing material'];
  return GENERAL_PLACEHOLDER;
};

// What to show for an item, and whether it is the item's own photograph.
export const itemImage = (item) => {
  const photo = itemPhotoUrl(item);
  return photo
    ? { src: photo, isPhoto: true }
    : { src: itemPlaceholderUrl(item), isPhoto: false };
};

// Kept for callers that only want a real photo and nothing in its place.
export const itemImageUrl = itemPhotoUrl;

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
