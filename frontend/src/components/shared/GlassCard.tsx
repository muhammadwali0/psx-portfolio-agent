import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  hover?: boolean;
  variant?: 'default' | 'premium' | 'gold';
}

const paddings = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export default function GlassCard({ children, className = '', padding = 'md', hover = false, variant = 'default' }: Props) {
  const base = variant === 'premium'
    ? 'card-premium'
    : variant === 'gold'
      ? 'glass-gold rounded-2xl'
      : 'glass-card';
  
  const hoverClass = hover && variant === 'default'
    ? 'hover:-translate-y-[1px] hover:shadow-elevated cursor-pointer'
    : hover
      ? 'cursor-pointer'
      : '';

  return (
    <div
      className={`
        ${base} ${paddings[padding]}
        ${hoverClass}
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
}
