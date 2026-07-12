import './ProgressRing.css';

export default function ProgressRing({ progress = 0.6, size = 48, strokeWidth = 4, label, sublabel }) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - progress * circumference;

  return (
    <div className="progress-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="progress-ring__svg">
        <circle
          className="progress-ring__track"
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          className="progress-ring__fill"
          cx={size / 2} cy={size / 2} r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {(label || sublabel) && (
        <div className="progress-ring__label">
          {label && <span className="progress-ring__main">{label}</span>}
          {sublabel && <span className="progress-ring__sub">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
