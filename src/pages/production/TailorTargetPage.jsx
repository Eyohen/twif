import { Award } from 'lucide-react';
import { TailorTargetBoard } from '../../components/oms/TailorTargets';

// The Production Manager's own Tailor Target tab: the weekly target for every
// tailor and what each has completed against it, with earlier weeks a step
// back. It is a view — the targets themselves are set by the Owner.
export default function TailorTargetPage() {
  return (
    <div className="os-page">
      <div className="os-page-header">
        <div className="os-page-title">
          <Award size={22} strokeWidth={1.6} style={{ color: '#c97b08' }} />
          <div>
            <h2>Tailor Target</h2>
            <p>Jobs each tailor has completed this week against their weekly target. Step back to review earlier weeks.</p>
          </div>
        </div>
      </div>
      <div className="os-card">
        <div className="os-card-body"><TailorTargetBoard /></div>
      </div>
    </div>
  );
}
