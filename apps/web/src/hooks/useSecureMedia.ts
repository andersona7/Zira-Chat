import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export const useSecureMedia = (mediaIdOrUrl: string | undefined) => {
  const [secureUrl, setSecureUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const token = useSelector((state: RootState) => state.auth.token);

  useEffect(() => {
    if (!mediaIdOrUrl) {
      setSecureUrl('');
      return;
    }

    // If it's a data URL, blob, or non-Cloudinary external URL, use it directly
    if (
      mediaIdOrUrl.startsWith('blob:') ||
      mediaIdOrUrl.startsWith('data:') ||
      (mediaIdOrUrl.startsWith('http') && !mediaIdOrUrl.includes('cloudinary.com'))
    ) {
      setSecureUrl(mediaIdOrUrl);
      return;
    }

    // Extract legacy publicId if a full legacy Cloudinary URL is passed
    let mediaId = mediaIdOrUrl;
    if (mediaIdOrUrl.startsWith('http') && mediaIdOrUrl.includes('cloudinary.com')) {
      const parts = mediaIdOrUrl.split('/upload/');
      if (parts.length >= 2) {
        const pathParts = parts[1].split('/');
        if (pathParts[0].startsWith('v')) {
          pathParts.shift(); // remove version segment
        }
        const fullId = pathParts.join('/');
        const lastDot = fullId.lastIndexOf('.');
        mediaId = lastDot === -1 ? fullId : fullId.substring(0, lastDot);
      }
    }

    let isMounted = true;
    setIsLoading(true);

    const fetchSignedUrl = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || ''}/api/v1/media/${encodeURIComponent(mediaId)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch secure media URL');
        }

        const resData = await response.json();
        if (resData.success && resData.url && isMounted) {
          setSecureUrl(resData.url);
        } else if (isMounted) {
          setError(resData.error || 'Failed to retrieve URL');
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Fetch error');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSignedUrl();

    // Auto-revoke local URL state before token expires (30s lifetime)
    const expiryTimer = setTimeout(() => {
      if (isMounted) {
        setSecureUrl('');
      }
    }, 28000);

    return () => {
      isMounted = false;
      clearTimeout(expiryTimer);
    };
  }, [mediaIdOrUrl, token]);

  return { secureUrl, isLoading, error };
};
