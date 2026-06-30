import React from 'react';
import { Avatar } from '@zira/ui';
import { useSecureMedia } from '@/hooks/useSecureMedia';
import { Loader2 } from 'lucide-react';
import { cn } from '@zira/utils';

interface SecureMediaProps {
  src?: string;
  type: 'img' | 'video' | 'audio' | 'avatar';
  className?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showOnline?: boolean;
  loading?: 'lazy' | 'eager';
  controls?: boolean;
  onClick?: () => void;
}

export const SecureMedia: React.FC<SecureMediaProps> = ({
  src,
  type,
  className,
  alt,
  fallback = '?',
  size = 'md',
  showOnline,
  loading = 'lazy',
  controls = true,
  onClick,
}) => {
  const { secureUrl, isLoading } = useSecureMedia(src);

  if (isLoading && type !== 'avatar') {
    return (
      <div className={cn("flex items-center justify-center bg-black/10 dark:bg-white/5 rounded-xl min-h-[100px]", className)}>
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  const displayUrl = secureUrl || src;

  if (type === 'avatar') {
    return (
      <Avatar
        src={secureUrl ? secureUrl : undefined}
        alt={alt}
        fallback={fallback}
        size={size}
        className={className}
        onClick={onClick}
        showOnline={showOnline}
      />
    );
  }

  if (type === 'img') {
    return (
      <img
        src={displayUrl}
        alt={alt}
        className={className}
        loading={loading}
        onClick={onClick}
      />
    );
  }

  if (type === 'video') {
    return (
      <video
        src={displayUrl}
        className={className}
        controls={controls}
        onClick={onClick}
      />
    );
  }

  if (type === 'audio') {
    return (
      <audio
        src={displayUrl}
        className={className}
        controls={controls}
      />
    );
  }

  return null;
};
