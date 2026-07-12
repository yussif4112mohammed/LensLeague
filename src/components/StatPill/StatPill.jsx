import './StatPill.css';

export default function StatPill({ icon, value, label }) {
  return (
    <div className="stat-pill">
      {icon && <span className="stat-pill__icon">{icon}</span>}
      <span className="stat-pill__value">{value}</span>
      {label && <span className="stat-pill__label body-sm text-secondary">{label}</span>}
    </div>
  );
}
