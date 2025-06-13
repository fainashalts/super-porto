// Stub icon components to avoid lucide-react dependency
import React from 'react';

interface IconProps {
  className?: string;
}

export const Shield = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>🛡️</div>
);

export const Key = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>🔑</div>
);

export const Zap = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>⚡</div>
);

export const CheckCircle = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>✅</div>
);

export const AlertCircle = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>⚠️</div>
);

export const Clock = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>🕐</div>
);

export const Target = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>🎯</div>
);

export const TrendingUp = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>📈</div>
);

export const ArrowRight = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>→</div>
);

export const ExternalLink = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>🔗</div>
);

export const RotateCcw = ({ className }: IconProps) => (
  <div className={`${className} flex items-center justify-center`}>🔄</div>
); 