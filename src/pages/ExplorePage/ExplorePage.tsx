import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { spotifyService } from '../../services/spotify';
import { firebaseService } from '../../services/firebase';
import { auth } from '../../services/firebase';
import { TrackCard } from '../../components/TrackCard/TrackCard';
import { SearchFilters } from '../../components/SearchFilters/SearchFilters';
import { Pagination } from '../../components/Pagination/Pagination';
import styles from './ExplorePage.module.scss';

export function ExplorePage() {
  const { state, dispatch } = useAppContext();
  const { tracks, favorites, loading, error, filters, currentPage } = state;

  useEffect(() => {
    // 自動匿名登入
    const initAuth = async () => {
      if (!auth.currentUser) {
        try {
          const user = await firebaseService.signInAnonymously();
          dispatch({ type: 'SET_USER', payload: user });
        } catch (error) {
          console.error('Auth error:', error);
        }
      }
    };

    initAuth();
  }, [dispatch]);

  useEffect(() => {
    const loadTracks = async () => {
      if (!spotifyService.isAuthenticated()) return;

      dispatch({ type: 'SET_LOADING', payload: true });
      
      try {
        let result;
        const offset = (currentPage - 1) * 20;

        if (filters.query) {
          // 搜尋歌曲
          const searchResult = await spotifyService.searchTracks(filters.query, 20, offset);
          result = {
            tracks: searchResult.tracks.items,
            total: searchResult.tracks.total,
          };
        } else {
          // 獲取推薦歌曲
          const recommendations = await spotifyService.getRecommendations(
            filters.genre,
            undefined,
            20
          );
          result = {
            tracks: recommendations.tracks,
            total: recommendations.tracks.length * 10, // 估算總數
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

  useEffect(() => {
    // 載入收藏列表
    const loadFavorites = async () => {
      if (auth.currentUser) {
        try {
          const userFavorites = await firebaseService.getFavorites(auth.currentUser.uid);
          dispatch({ type: 'SET_FAVORITES', payload: userFavorites });
        } catch (error) {
          console.error('Error loading favorites:', error);
        }
      }
    };

    loadFavorites();
  }, [dispatch]);

  const handleLogin = async () => {
    const url = await spotifyService.getAuthUrl();
    window.location.href = url;
  };

  const isTrackFavorited = (trackId: string) => {
    return favorites.some(fav => fav.id === trackId);
  };

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
      
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>
          載入中...
        </div>
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