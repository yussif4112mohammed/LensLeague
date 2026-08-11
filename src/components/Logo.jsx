import { Aperture } from 'lucide-react';

export default function Logo({ className = "w-8 h-8", withText = false }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <div className="relative flex items-center justify-center">
        <img 
          src="/vercel_lens.jpg" 
          alt="LensLeague Logo" 
          className={`relative z-10 rounded-full object-cover border border-white/10 ${className}`} 
        />
      </div>
      {withText && (
        <span className="font-bold text-xl tracking-tight text-white flex items-center">
          LensLeague
        </span>
      )}
    </div>
  );
}
