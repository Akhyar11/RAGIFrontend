import React, { ReactNode } from 'react';
import { Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps {
  variant?: 'info' | 'warning' | 'success' | 'danger';
  icon?: ReactNode;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', icon, title, children, className }: AlertProps) {
  const variantStyles = {
    info: 'bg-slate-50 border-slate-200 text-slate-700',
    warning: 'bg-amber-50/70 border-amber-200 text-amber-800',
    success: 'bg-emerald-50/70 border-emerald-200 text-emerald-800',
    danger: 'bg-rose-50/70 border-rose-200 text-rose-800',
  };

  const defaultIcons = {
    info: <Info size={16} className="text-slate-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />,
    success: <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />,
    danger: <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />,
  };

  return (
    <div className={cn('p-3 rounded-xl border flex items-start gap-2.5 text-xs', variantStyles[variant], className)}>
      {icon ?? defaultIcons[variant]}
      <div className="flex-1 space-y-0.5">
        {title && <p className="font-semibold">{title}</p>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
