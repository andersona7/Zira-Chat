import {
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
} from '../../../store/api/gifApi';

export const useGifFavorites = () => {
  const { data: favoritesResponse, isLoading } = useGetFavoritesQuery();
  const [addFavoriteMut] = useAddFavoriteMutation();
  const [removeFavoriteMut] = useRemoveFavoriteMutation();

  const favoriteIds = favoritesResponse?.data || [];

  const isFavorite = (gifId: string) => {
    return favoriteIds.includes(gifId);
  };

  const toggleFavorite = async (gifId: string) => {
    try {
      if (isFavorite(gifId)) {
        await removeFavoriteMut(gifId).unwrap();
      } else {
        await addFavoriteMut(gifId).unwrap();
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  return {
    favoriteIds,
    isLoading,
    isFavorite,
    toggleFavorite,
  };
};
