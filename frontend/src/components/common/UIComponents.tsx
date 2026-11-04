/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium transition-colors cursor-pointer select-none whitespace-nowrap shrink-0 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 rounded-lg gap-1.5',
    md: 'text-sm px-4 py-2 rounded-lg gap-2',
    lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5',
  }[size];

  const variantClasses = {
    primary: 'bg-teal-900 text-white hover:bg-teal-800 focus-visible:ring-teal-900',
    secondary: 'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-700',
    accent: 'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-600',
    outline: 'border border-stone-300 text-stone-800 bg-white hover:bg-stone-50 focus-visible:ring-teal-900',
    ghost: 'text-stone-700 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-teal-900',
    danger: 'bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-700',
  }[variant];

  return (
    <button
      className={`${base} ${sizeClasses} ${variantClasses} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  className = '',
  children,
  onClick,
}: {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-stone-200/70 p-6 shadow-xs ${
        onClick ? 'cursor-pointer hover:border-teal-700/40 transition-colors' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function NoticeBanner({
  type = 'info',
  title,
  message,
  className = '',
}: {
  type?: 'info' | 'warning' | 'success';
  title?: string;
  message: string;
  className?: string;
}) {
  const styles = {
    info: {
      bg: 'bg-teal-50/70 border-teal-200 text-teal-950',
      icon: <Info className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-50/80 border-amber-200 text-amber-950',
      icon: <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-50/70 border-emerald-200 text-emerald-950',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />,
    },
  }[type];

  return (
    <div className={`p-4 rounded-xl border ${styles.bg} ${className}`}>
      <div className="flex items-start gap-3">
        {styles.icon}
        <div className="text-sm">
          {title && <p className="font-semibold mb-0.5">{title}</p>}
          <p className="leading-relaxed opacity-90">{message}</p>
        </div>
      </div>
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth,
  size,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | string;
}) {
  if (!isOpen) return null;

  const resolvedMaxWidth = maxWidth || (size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-4xl' : size === 'sm' ? 'max-w-md' : 'max-w-xl');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl border border-stone-200 shadow-xl w-full ${resolvedMaxWidth} overflow-hidden transition-all`}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-stone-900">{title}</h3>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function MetadataRow({
  items,
  className = '',
}: {
  items: (string | React.ReactNode)[];
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs text-stone-500 ${className}`}>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span aria-hidden="true" className="text-stone-300">·</span>}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

export function Badge({
  variant = 'neutral',
  children,
  className = '',
}: {
  variant?: 'verified' | 'urgent' | 'pending' | 'success' | 'neutral' | 'active';
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    verified: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    urgent: 'bg-rose-50 text-rose-800 border-rose-200',
    pending: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-teal-50 text-teal-800 border-teal-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200',
    active: 'bg-sky-50 text-sky-800 border-sky-200',
  }[variant];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}>
      {children}
    </span>
  );
}

