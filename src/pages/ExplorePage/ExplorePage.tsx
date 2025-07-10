import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { spotifyService } from '../../services/spotify';
import { firebaseService, auth } from '../../services/firebase';
import { TrackCard } from '../../components/TrackCard/TrackCard';
import { SearchFilters } from '../../components/SearchFilters/SearchFilters';
import { Pagination } from '../../components/Pagination/Pagination';
import styles from './ExplorePage.module.scss';

export function ExplorePage() {
  const { state, dispatch } = useAppContext();
  const { tracks, favorites, loading, error, filters, currentPage } = state;

  // 僅在 Spotify 已登入時載入收藏
  useEffect(() => {
    if (!spotifyService.isAuthenticated() || !auth.currentUser) return;
    const loadFavorites = async () => {
      try {
        if (!auth.currentUser) return;
        const userFavorites = await firebaseService.getFavorites(auth.currentUser.uid);
        dispatch({ type: 'SET_FAVORITES', payload: userFavorites });
      } catch (error) {
        console.error('Error loading favorites:', error);
      }
    };
    loadFavorites();
  }, [dispatch]);

  useEffect(() => {
    if (!spotifyService.isAuthenticated()) return;
    const loadTracks = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        let result;
        const offset = (currentPage - 1) * 20;

        if (filters.query) {
          const searchResult = await spotifyService.searchTracks(filters.query, 20, offset);
          result = {
            tracks: searchResult.tracks.items,
            total: searchResult.tracks.total,
          };
        } else {
          const recommendations = await spotifyService.getRecommendations(
            filters.genre,
            undefined,
            20
          );
          result = {
            tracks: recommendations.tracks,
            total: recommendations.tracks.length * 10,
          };
        }

        dispatch({ type: 'SET_TRACKS', payload: result });
      } catch (error) {
        console.error('Error loading tracks:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load tracks' });
      }
    };

    loadTracks();
  }, [filters, currentPage, dispatch]);

  const handleLogin = async () => {
    const url = await spotifyService.getAuthUrl();
    window.location.href = url;
  };

  const isTrackFavorited = (trackId: string) => {
    return favorites.some(fav => fav.id === trackId);
  };

  // 未登入時只顯示登入按鈕
  if (!spotifyService.isAuthenticated()) {
    return (
      <div className={styles.explorePage}>
        <div className={styles.authPrompt}>
          <h2>🎵 歡迎來到音樂探索</h2>
          <p>連接您的 Spotify 帳戶以開始探索音樂</p>
          <button className={styles.loginButton} onClick={handleLogin}>
            🎧 連接 Spotify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.explorePage}>
      <h1 className={styles.pageTitle}>探索音樂</h1>
      <SearchFilters />
      {loading ? (
        <div className={styles.loading}>載入中...</div>
      ) : tracks.length === 0 ? (
        <div className={styles.noResults}>
          <h3>沒有找到歌曲</h3>
          <p>請嘗試不同的搜尋條件或篩選器</p>
        </div>
      ) : (
        <>
          <div className={styles.tracksGrid}>
            {tracks.map(track => (
              <TrackCard
                key={track.id}
                track={track}
                isFavorite={isTrackFavorited(track.id)}
              />
            ))}
          </div>
          <Pagination />
        </>
      )}
    </div>
  );
}