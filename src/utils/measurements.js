// The measurements a tailor takes. Every one starts empty: a chart that
// arrives pre-filled with 16in neck and 42in chest is a garment cut wrong.
// The set the shop actually measures to, grouped the way a tailor works.
// "Length" appears under both Top and Bottom and means different things, so a
// field is keyed by its group as well as its name.
export const MEASUREMENT_GROUPS = [
  { group: 'Top', fields: ['Shoulder', 'Sleeve', 'Chest', 'Stomach', 'Length', 'Round Sleeve', 'Neck'] },
  { group: 'Bottom', fields: ['Waist', 'Lap', 'Hip', 'Length', 'Calf', 'Ankle'] },
  {
    group: 'Others',
    fields: [
      'Agbada Length', 'Agbada Sleeve', 'Cap', 'Nipple to Nipple', 'Half Length',
      'Half Back', 'Inseam Length', 'Mini Skirt', 'Midi Skirt', 'Knee Length',
    ],
  },
];

export const MEASUREMENT_FIELDS = MEASUREMENT_GROUPS.flatMap(({ group, fields }) =>
  fields.map((label) => ({ group, label, key: `${group}_${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '_') })));

// Measurements taken before this set existed were stored under bare names.
// They are read under the old key when the new one is empty, so nobody's
// figures disappear the day the list changes.
export const LEGACY_MEASUREMENT_KEYS = {
  top_shoulder: 'shoulder', top_chest: 'chest', top_neck: 'neck',
  top_length: 'toplength', top_sleeve: 'sleevelength',
  bottom_waist: 'trouserwaist', bottom_hip: 'trouserhip', bottom_length: 'trouserlength(outseam)',
};

const POSITION = new Map(MEASUREMENT_FIELDS.map((field, index) => [field.key, index]));
Object.entries(LEGACY_MEASUREMENT_KEYS).forEach(([key, legacy]) => {
  if (!POSITION.has(legacy)) POSITION.set(legacy, POSITION.get(key));
});
const FIELD_BY_KEY = new Map(MEASUREMENT_FIELDS.map((field) => [field.key, field]));

const readable = (key) => String(key).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

// A stored set of measurements comes back from the database as an object whose
// keys are in the database's own order — shortest name first, then
// alphabetical — which is nothing like the order the store manager worked down
// the measurement sheet in. A tailor reading Neck, Hip, Lap, Chest, Waist … is
// reading a scattered list, which is how a figure gets missed at the cutting
// table. Every screen that shows a set of measurements lists them through this,
// in the sheet's own order (Top, then Bottom, then Others), with anything that
// is not on the sheet after those, alphabetically.
export const orderedMeasurementEntries = (details = {}) => Object.entries(details || {})
  .filter(([key]) => key !== 'profile')
  .map(([key, value]) => {
    const field = FIELD_BY_KEY.get(key);
    return { key, value, label: field ? `${field.group} ${field.label}` : readable(key) };
  })
  .sort((a, b) => {
    const left = POSITION.has(a.key) ? POSITION.get(a.key) : Number.MAX_SAFE_INTEGER;
    const right = POSITION.has(b.key) ? POSITION.get(b.key) : Number.MAX_SAFE_INTEGER;
    return left - right || a.label.localeCompare(b.label);
  });
