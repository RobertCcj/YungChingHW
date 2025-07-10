import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { firebaseService, auth } from '../../services/firebase';
import { TrackCard } from '../../components/TrackCard/TrackCard';
import { spotifyService } from '../../services/spotify';
import styles from './FavoritesPage.module.scss';

export function FavoritesPage() {
  const { state, dispatch } = useAppContext();
  const { favorites, loading, error } = state;
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  // 僅在 Spotify 已登入時載入收藏
  useEffect(() => {
    if (!spotifyService.isAuthenticated() || !auth.currentUser) return;
    const loadFavorites = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        if (!auth.currentUser) return;
        const userFavorites = await firebaseService.getFavorites(auth.currentUser.uid);
        dispatch({ type: 'SET_FAVORITES', payload: userFavorites });
      } catch (error) {
        console.error('Error loading favorites:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load favorites' });
      }
    };
    loadFavorites();
  }, [dispatch]);

  const handleSelectTrack = (trackId: string, isSelected: boolean) => {
    const newSelected = new Set(selectedTracks);
    if (isSelected) {
      newSelected.add(trackId);
    } else {
      newSelected.delete(trackId);
    }
    setSelectedTracks(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTracks.size === favorites.length) {
      setSelectedTracks(new Set());
    } else {
      setSelectedTracks(new Set(favorites.map(fav => fav.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!auth.currentUser || selectedTracks.size === 0) return;
    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedTracks).map(trackId =>
        firebaseService.removeFavorite(trackId, auth.currentUser!.uid)
      );
      await Promise.all(deletePromises);
      const updatedFavorites = favorites.filter(fav => !selectedTracks.has(fav.id));
      dispatch({ type: 'SET_FAVORITES', payload: updatedFavorites });
      setSelectedTracks(new Set());
    } catch (error) {
      console.error('Error deleting favorites:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete favorites' });
    } finally {
      setIsDeleting(false);
    }
  };

  // 未登入時只顯示登入按鈕
  if (!spotifyService.isAuthenticated()) {
    return (
      <div className={styles.favoritesPage}>
        <div className={styles.emptyState}>
          <h3>請先登入</h3>
          {/* <button className={styles.loginButton} onClick={async () => {
            const url = await spotifyService.getAuthUrl();
            window.location.href = url;
          }}>
            🎧 連接 Spotify
          </button> */}
          <Link to="/explore" className={styles.exploreLink}>
            🔍 探索音樂
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.favoritesPage}>
        <div className={styles.loading}>載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.favoritesPage}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.favoritesPage}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>我的最愛</h1>
        <p className={styles.pageSubtitle}>
          總共 {favorites.length} 首歌曲
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>🎵 還沒有收藏任何歌曲</h3>
          <p>前往探索頁面發現您喜愛的音樂吧！</p>
          <Link to="/explore" className={styles.exploreLink}>
            🔍 探索音樂
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.bulkActions}>
            <div className={styles.selectionInfo}>
              <button
                className={styles.selectAllButton}
                onClick={handleSelectAll}
              >
                {selectedTracks.size === favorites.length ? '取消全選' : '全選'}
              </button>
              
              {selectedTracks.size > 0 && (
                <span className={styles.selectedCount}>
                  已選擇 {selectedTracks.size} 首歌曲
                </span>
              )}
            </div>

            <button
              className={styles.bulkDeleteButton}
              onClick={handleBulkDelete}
              disabled={selectedTracks.size === 0 || isDeleting}
            >
              {isDeleting ? '刪除中...' : `刪除選中的歌曲 (${selectedTracks.size})`}
            </button>
          </div>

          <div className={styles.favoritesGrid}>
            {favorites.map(favorite => (
              <div key={favorite.id} className={styles.favoriteCard}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={selectedTracks.has(favorite.id)}
                  onChange={(e) => handleSelectTrack(favorite.id, e.target.checked)}
                />
                <TrackCard
                  track={favorite}
                  isFavorite={true}
                  showNoteEditor={true}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}