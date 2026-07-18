import React from 'react';

interface SFLLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SFLLogo: React.FC<SFLLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-xl',
    lg: 'w-20 h-20 text-2xl'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-sky-600 rounded-lg transform rotate-3 shadow-lg"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-sky-700 rounded-lg transform -rotate-3 shadow-xl"></div>
      <div className="relative inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-sky-600 rounded-lg shadow-2xl border-2 border-white/20">
        <span className="font-bold text-white tracking-tighter">SFL</span>
      </div>
    </div>
  );
};

export default SFLLogo;
