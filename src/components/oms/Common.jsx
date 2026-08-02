import { classNames } from '../../utils/oms';

export function Stat({ label, value, detail, tone = 'dark' }) {
  return <article className={classNames('stat', `stat-${tone}`)}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

export function Status({ children }) {
  const normalized = String(children).toLowerCase().replace(/\s+/g, '-');
  return <span className={classNames('status', `status-${normalized}`)}>{children}</span>;
}

export function SectionHeader({ eyebrow, title, children }) {
  return <div className="section-header"><div><p>{eyebrow}</p><h2>{title}</h2></div>{children}</div>;
}
