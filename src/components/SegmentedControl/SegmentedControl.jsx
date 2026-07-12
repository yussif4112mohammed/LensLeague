import './SegmentedControl.css';

export default function SegmentedControl({ options, value, onChange, id = 'seg' }) {
  return (
    <div className="seg-control" role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          className={`seg-control__btn ${value === opt.value ? 'seg-control__btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
          id={`${id}-${opt.value}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
