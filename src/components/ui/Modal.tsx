"use client";

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';
  children: React.ReactNode;
  hideHeader?: boolean;
  headerContent?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  disableBackdropClick?: boolean;
}

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  subtitle,
  size = 'md', 
  children,
  hideHeader = false,
  headerContent,
  className = '',
  bodyClassName = '',
  disableBackdropClick = false
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !disableBackdropClick) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, disableBackdropClick]);

  if (!isOpen || !mounted) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    full: 'max-w-[96vw] h-[94vh]'
  }[size];

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Full-Screen Glassmorphic Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity animate-backdrop-fade"
        onClick={() => {
          if (!disableBackdropClick) onClose();
        }}
      ></div>
      
      {/* Modal Container */}
      <div 
        className={`bg-white rounded-3xl shadow-2xl w-full ${sizeClasses} mx-auto relative z-10 overflow-hidden flex flex-col max-h-[92vh] border border-gray-100 animate-modal-pop ${className}`}
      >
        {/* Header */}
        {!hideHeader && (
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white shrink-0">
            {headerContent ? (
              headerContent
            ) : (
              <div>
                {subtitle && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-violet block font-mono">
                    {subtitle}
                  </span>
                )}
                <h3 className="text-xl font-serif font-bold text-brand-textMain leading-tight">{title}</h3>
              </div>
            )}
            <button 
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors font-bold text-base ml-4 shrink-0"
            >
              ✕
            </button>
          </div>
        )}
        
        {/* Body (Scrollable) */}
        <div className={`p-6 overflow-y-auto flex-1 min-h-0 ${bodyClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
