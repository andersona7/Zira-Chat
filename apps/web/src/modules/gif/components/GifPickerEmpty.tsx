import React from 'react';

interface GifPickerEmptyProps {
  title: string;
  description: string;
  emoji?: string;
}

export const GifPickerEmpty: React.FC<GifPickerEmptyProps> = ({ title, description, emoji = '🤷' }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-6 bg-surface-hover/20 border border-dashed border-border/40 rounded-2xl min-h-[220px]">
      <span className="text-3xl mb-2 animate-bounce">{emoji}</span>
      <h4 className="text-xs font-bold text-text-primary mb-1">{title}</h4>
      <p className="text-[10px] text-text-muted max-w-[200px] leading-relaxed">
        {description}
      </p>
    </div>
  );
};
