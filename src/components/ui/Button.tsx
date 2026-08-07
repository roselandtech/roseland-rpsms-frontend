import React, { useState } from 'react';
import toast from 'react-hot-toast';

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'muted';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  simulateSaveMessage?: string;
  simulateDuration?: number;
}

export default function Button({ 
  variant = 'primary', 
  icon, 
  children, 
  fullWidth = false, 
  isLoading = false,
  loadingText = 'Saving...',
  simulateSaveMessage,
  simulateDuration = 800,
  className = '', 
  disabled,
  onClick,
  ...props 
}: ButtonProps) {
  
  const [isSimulating, setIsSimulating] = useState(false);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (simulateSaveMessage) {
      setIsSimulating(true);
      setTimeout(() => {
        setIsSimulating(false);
        toast.success(simulateSaveMessage);
        if (onClick) onClick(e);
      }, simulateDuration);
    } else if (onClick) {
      onClick(e);
    }
  };

  const actualIsLoading = isLoading || isSimulating;

  // Base classes that all buttons share
  const baseClasses = "inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-xl transition-colors outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-violetLight disabled:opacity-80 disabled:cursor-not-allowed";
  
  // Variant-specific classes
  const variants = {
    primary: "bg-brand-violet text-white hover:bg-brand-violetDark shadow-sm",
    secondary: "bg-white border border-gray-200 text-brand-textMain hover:bg-gray-50 shadow-sm",
    accent: "bg-brand-yellow text-brand-textMain hover:bg-yellow-500 shadow-sm shadow-brand-yellow/30 font-semibold",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700",
    ghost: "bg-transparent text-gray-500 hover:text-brand-violet hover:bg-brand-violetLight",
    muted: "bg-gray-50 text-brand-textMuted hover:text-brand-textMain hover:bg-gray-100"
  };

  const widthClass = fullWidth ? "w-full" : "";
  const isDisabled = disabled || actualIsLoading;

  return (
    <button 
      className={`${baseClasses} ${variants[variant]} ${widthClass} ${className}`}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {actualIsLoading ? (
        <>
          <i className="ph ph-spinner animate-spin text-lg"></i>
          {loadingText}
        </>
      ) : (
        <>
          {icon && <span className="flex items-center justify-center">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}
