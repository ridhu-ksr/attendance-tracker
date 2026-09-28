import React from 'react';
import { X } from 'lucide-react';

export interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'tint' | 'navy' | 'danger';
  hover?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  variant = 'default',
  hover = false,
  onClick,
}) => {
  const variantClass =
    variant === 'elevated'
      ? 'liquid-glass-elevated'
      : variant === 'tint'
      ? 'liquid-glass-tint'
      : variant === 'navy'
      ? 'liquid-glass-navy'
      : variant === 'danger'
      ? 'liquid-glass-danger'
      : 'liquid-glass';

  return (
    <div
      onClick={onClick}
      className={`${variantClass} rounded-[24px] p-6 ${hover ? 'glass-hover' : ''} ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'present' | 'absent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const sizeClass =
    size === 'sm'
      ? 'px-3.5 py-1.5 text-xs rounded-xl'
      : size === 'lg'
      ? 'px-6 py-3 text-sm rounded-2xl'
      : 'px-4 py-2.5 text-sm rounded-xl';

  const variantStyle =
    variant === 'primary'
      ? 'bg-[#1B3A6B] hover:bg-[#0D1B2A] text-white shadow-[0_6px_20px_rgba(27,58,107,0.22)] border border-white/20'
      : variant === 'present'
      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-[0_4px_14px_rgba(4,120,87,0.22)] border border-white/20'
      : variant === 'absent'
      ? 'bg-rose-700 hover:bg-rose-800 text-white shadow-[0_4px_14px_rgba(190,18,60,0.22)] border border-white/20'
      : variant === 'danger'
      ? 'bg-red-700 hover:bg-red-800 text-white shadow-[0_4px_14px_rgba(185,28,28,0.22)] border border-white/20'
      : variant === 'ghost'
      ? 'bg-transparent hover:bg-white/50 text-[#1B3A6B]'
      : 'bg-white/70 hover:bg-white/95 text-[#0D1B2A] border border-[#A8C5E0]/70 shadow-sm';

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${sizeClass} ${variantStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export interface GlassInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const GlassInput: React.FC<GlassInputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[#1B3A6B]">{label}</label>}
      <input
        className={`liquid-glass-input px-3.5 py-2.5 rounded-xl text-sm text-[#0D1B2A] placeholder:text-[#6B8CAE] ${className}`}
        {...props}
      />
    </div>
  );
};

export interface GlassSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const GlassSelect: React.FC<GlassSelectProps> = ({
  label,
  children,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[#1B3A6B]">{label}</label>}
      <select
        className={`liquid-glass-input px-3.5 py-2.5 rounded-xl text-sm text-[#0D1B2A] cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export interface GlassProgressProps {
  value: number; // 0 to 100
  target?: number; // e.g. 90
  threshold?: number; // e.g. 75
  tone?: 'blue' | 'emerald' | 'amber' | 'crimson';
  heightClass?: string;
}

export const GlassProgress: React.FC<GlassProgressProps> = ({
  value,
  target = 90,
  threshold = 75,
  tone,
  heightClass = 'h-3',
}) => {
  const clamped = Math.max(0, Math.min(100, value));
  const resolvedTone =
    tone ||
    (clamped < threshold
      ? 'crimson'
      : clamped < threshold + 5
      ? 'amber'
      : clamped >= target
      ? 'emerald'
      : 'blue');

  const fillGrad =
    resolvedTone === 'crimson'
      ? 'bg-gradient-to-r from-red-600 to-rose-500'
      : resolvedTone === 'amber'
      ? 'bg-gradient-to-r from-amber-600 to-amber-500'
      : resolvedTone === 'emerald'
      ? 'bg-gradient-to-r from-[#1B3A6B] to-emerald-600'
      : 'bg-gradient-to-r from-[#1B3A6B] via-[#3D5A80] to-[#6B8CAE]';

  return (
    <div
      className={`relative w-full ${heightClass} rounded-full bg-[#E8F1FA]/90 border border-white/80 overflow-hidden shadow-inner`}
    >
      <div
        className={`h-full rounded-full transition-all duration-300 ${fillGrad}`}
        style={{ width: `${clamped}%` }}
      />
      {threshold > 0 && threshold < 100 && (
        <div
          title={`Minimum Required (${threshold}%)`}
          className="absolute top-0 bottom-0 w-[2px] bg-red-600/70"
          style={{ left: `${threshold}%` }}
        />
      )}
      {target > 0 && target < 100 && (
        <div
          title={`Target (${target}%)`}
          className="absolute top-0 bottom-0 w-[2px] bg-[#0D1B2A]/60"
          style={{ left: `${target}%` }}
        />
      )}
    </div>
  );
};

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-2xl',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D1B2A]/40 backdrop-blur-sm">
      <div
        className={`liquid-glass-elevated w-full ${maxWidthClass} rounded-[28px] p-6 md:p-8 max-h-[90vh] overflow-y-auto`}
      >
        <div className="flex items-start justify-between gap-4 pb-4 mb-5 border-b border-[#CDE1F2]/70">
          <div>
            <h3 className="text-xl font-bold text-[#0D1B2A]">{title}</h3>
            {subtitle && <p className="text-xs text-[#3D5A80] mt-1">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/70 text-[#3D5A80] hover:text-[#0D1B2A] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export interface GlassChartCardProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const GlassChartCard: React.FC<GlassChartCardProps> = ({
  title,
  subtitle,
  rightElement,
  children,
  className = '',
}) => {
  return (
    <GlassCard className={`flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-base font-semibold text-[#0D1B2A]">{title}</h3>
          {subtitle && <p className="text-xs text-[#3D5A80] mt-0.5">{subtitle}</p>}
        </div>
        {rightElement && <div>{rightElement}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </GlassCard>
  );
};

export interface GlassAlertProps {
  title: string;
  description: string;
  tone?: 'danger' | 'warning' | 'info' | 'success';
  children?: React.ReactNode;
}

export const GlassAlert: React.FC<GlassAlertProps> = ({
  title,
  description,
  tone = 'info',
  children,
}) => {
  const toneStyles =
    tone === 'danger'
      ? 'liquid-glass-danger border-red-500/40 text-red-950'
      : tone === 'warning'
      ? 'bg-amber-50/80 border border-amber-400/50 text-amber-950 backdrop-blur-xl'
      : tone === 'success'
      ? 'bg-emerald-50/80 border border-emerald-400/50 text-emerald-950 backdrop-blur-xl'
      : 'liquid-glass-tint text-[#0D1B2A]';

  return (
    <div className={`rounded-[24px] p-5 ${toneStyles}`}>
      <div className="font-bold text-base">{title}</div>
      <p className="text-sm mt-1 opacity-90">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};
