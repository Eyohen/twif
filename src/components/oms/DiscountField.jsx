import { money, toNumber } from '../../utils/oms';

// One discount control for every invoice line, on the new-invoice screen and on
// Edit. Which unit the line is in is shown, not implied: two buttons say "%" and
// "₦ Figure" and the pressed one is the unit of the box beside them. The old
// single button was labelled with the unit you would *switch to*, so a line in
// percent carried a "Use Figures" button and read as if it were in figures.
//
// What is typed is kept exactly as typed, and the other unit is only shown as
// an equivalent underneath.
export default function DiscountField({ item, onChange, label = 'Discount' }) {
  const inFigures = item.discountMode === 'amount';
  const gross = toNumber(item.rate) * toNumber(item.quantity);
  return (
    <label className="os-field discount-field">
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {label}
        <span role="group" aria-label="Discount unit" style={{ display: 'inline-flex', border: '1px solid #e3d9c8', borderRadius: 6, overflow: 'hidden' }}>
          {[['percent', '%'], ['amount', '₦ Figure']].map(([mode, text]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={(item.discountMode === 'amount') === (mode === 'amount')}
              onClick={() => onChange('discountMode', mode)}
              style={{
                fontSize: 12, fontWeight: 800, letterSpacing: 0, textTransform: 'none', padding: '2px 9px', cursor: 'pointer', border: 'none',
                background: (item.discountMode === 'amount') === (mode === 'amount') ? '#1a1611' : '#fff',
                color: (item.discountMode === 'amount') === (mode === 'amount') ? '#fff' : '#c97b08',
              }}
            >{text}</button>
          ))}
        </span>
      </span>
      {inFigures ? (
        <input type="number" min="0" step="any" aria-label="Discount in naira" value={item.discountAmount} onChange={(event) => onChange('discountAmount', event.target.value)} />
      ) : (
        <input type="number" min="0" max="100" step="any" aria-label="Discount in percent" value={item.discountPercent} onChange={(event) => onChange('discountPercent', event.target.value)} />
      )}
      <small style={{ fontSize: 11, fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#9a8a7a' }}>
        {inFigures
          ? `${money.format(toNumber(item.discountAmount))} off${gross > 0 ? ` (≈ ${((Math.min(toNumber(item.discountAmount), gross) / gross) * 100).toFixed(1)}%)` : ''}`
          : `${toNumber(item.discountPercent)}% off (≈ ${money.format((gross * Math.min(toNumber(item.discountPercent), 100)) / 100)})`}
      </small>
    </label>
  );
}
