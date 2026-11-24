import React from 'react';

interface VelaLogoProps {
  className?: string;
  variant?: 'dark' | 'light' | 'lime';
  size?: 'sm' | 'md' | 'lg';
}

export const VelaLogo: React.FC<VelaLogoProps> = ({
  className = '',
  variant = 'dark',
  size = 'md',
}) => {
  const sizeStyles = {
    sm: { img: 'h-5 w-auto', badge: 'text-[9px] px-1 py-0.2' },
    md: { img: 'h-6 w-auto', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { img: 'h-8 w-auto', badge: 'text-[11px] px-2 py-0.5' },
  };

  const logoSrc =
    variant === 'lime'
      ? '/vela-logo-lime-opt.png'
      : variant === 'light'
      ? '/vela-logo-white-opt.png'
      : '/vela-logo-black-opt.png';

  const badgeStyles =
    variant === 'lime'
      ? 'bg-[#161817] text-[#C5F36A]'
      : variant === 'light'
      ? 'bg-[#C5F36A] text-[#161817]'
      : 'bg-[#161817] text-[#C5F36A]';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <img
        src={logoSrc}
        alt="vela"
        className={`${sizeStyles[size].img} object-contain`}
      />
      <span
        className={`${badgeStyles} ${sizeStyles[size].badge} font-bold rounded tracking-wider uppercase font-mono`}
      >
        AI
      </span>
    </div>
  );
};
