import { Aperture } from 'lucide-react';

export default function Logo({ className = "w-8 h-8", withText = false }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="relative flex items-center justify-center">
        {/* Subtle glow effect behind the logo */}
        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
        <img 
          src="/neon_lens.jpg" 
          alt="LensLeague Logo" 
          className={`relative z-10 rounded-full object-cover ${className}`} 
        />
      </div>
      {withText && (
        <span className="font-bold text-xl tracking-tight text-white flex items-center">
          Lens<span className="text-primary">League</span>
        </span>
      )}
    </div>
  );
}
