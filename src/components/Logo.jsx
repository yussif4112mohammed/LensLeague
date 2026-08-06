export default function Logo({ className = "w-8 h-8", withText = false }) {
  return (
    <div className="flex items-center gap-2">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 100 100" 
        className={className}
      >
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF1B8" />
            <stop offset="50%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#997A15" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Background / Base shape representing a camera lens/aperture edge */}
        <circle cx="50" cy="50" r="45" fill="none" stroke="url(#goldGradient)" strokeWidth="4" strokeDasharray="30 10" opacity="0.3" />
        <circle cx="50" cy="50" r="40" fill="#0A0A0A" stroke="#1A1A1A" strokeWidth="2" />
        
        {/* The 'L' monogram crafted from sleek polygons */}
        {/* Vertical Stem */}
        <path d="M 35 25 L 47 25 L 47 63 L 35 75 Z" fill="url(#goldGradient)" filter="url(#glow)" />
        {/* Horizontal Stem */}
        <path d="M 45 63 L 75 63 L 75 75 L 35 75 Z" fill="url(#goldGradient)" filter="url(#glow)" />
        
        {/* Subtle light reflection on the lens */}
        <path d="M 15 50 A 35 35 0 0 1 50 15" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity="0.2" />
      </svg>
      {withText && (
        <span className="font-bold text-xl tracking-tight text-white">
          Lens<span className="text-[#FFFFFF]">League</span>
        </span>
      )}
    </div>
  );
}
