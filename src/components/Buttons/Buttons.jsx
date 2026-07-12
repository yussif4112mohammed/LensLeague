import './Buttons.css';

export function PrimaryButton({ children, onClick, disabled, type = 'button', id, fullWidth, small }) {
  return (
    <button
      id={id}
      type={type}
      className={`btn btn--primary ${fullWidth ? 'btn--full' : ''} ${small ? 'btn--small' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, type = 'button', id, fullWidth, small }) {
  return (
    <button
      id={id}
      type={type}
      className={`btn btn--secondary ${fullWidth ? 'btn--full' : ''} ${small ? 'btn--small' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, onClick, label, id, active }) {
  return (
    <button
      id={id}
      type="button"
      className={`btn btn--icon ${active ? 'btn--icon-active' : ''}`}
      onClick={onClick}
      aria-label={label}
    >
      {children}
    </button>
  );
}
