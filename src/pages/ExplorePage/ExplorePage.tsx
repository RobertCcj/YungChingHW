import React, { useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { spotifyService } from '../../services/spotify';
import { firebaseService, auth } from '../../services/firebase';
import { TrackCard } from '../../components/TrackCard/TrackCard';
import { SearchFilters } from '../../components/SearchFilters/SearchFilters';
import { Pagination } from '../../components/Pagination/Pagination';
import styles from './ExplorePage.module.scss';
import { useLocation } from 'react-router-dom';

export function ExplorePage() {
  const { state, dispatch } = useAppContext();
  const location = useLocation(); 
  const { tracks, favorites, loading, error, filters, currentPage } = state;

  // 新增：在 ExplorePage 卸載時自動清空搜尋相關 state
  useEffect(() => {
    // 返回清理函數，會在組件卸載時執行
    return () => {
      console.log('ExplorePage 卸載，清空搜尋狀態');
      dispatch({ type: 'SET_TRACKS', payload: { tracks: [], total: 0 } });
      dispatch({ type: 'SET_FILTERS', payload: { query: '', genre: '' } });
      dispatch({ type: 'SET_PAGE', payload: 1 });
    };
  }, [dispatch]); // 只依賴 dispatch，確保只在卸載時執行一次

  // 僅在 Spotify 已登入時載入收藏 (保持不變)
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

  // 處理 tracks 載入的 useEffect (保持不變)
  useEffect(() => {
    if (!spotifyService.isAuthenticated()) return;
    
    // 如果沒有任何過濾條件，直接返回，不查詢
    if (!filters.query && !filters.genre) return;
    
    const loadTracks = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        let result;
        const offset = (currentPage - 1) * 20;

        // 如果有查詢文字，使用 search API
        if (filters.query) {
          console.log('使用關鍵字搜尋:', filters.query);
          
          // 如果同時也有 genre，將 genre 添加到 query 中
          let combinedQuery = filters.query;
          if (filters.genre) {
            combinedQuery = `${filters.query} genre:${filters.genre}`;
          }
          
          const searchResult = await spotifyService.searchTracks(combinedQuery, 20, offset);
          result = {
            tracks: searchResult.tracks.items,
            total: searchResult.tracks.total,
          };
        } 
        // 只有 genre 沒有查詢文字，使用 recommendations API
        else if (filters.genre) {
          console.log('使用 genre 推薦:', filters.genre);
          
          try {
            // 1. 先取得 Spotify 官方支援的 genre seeds 列表
            const availableGenres = await spotifyService.getAvailableGenreSeeds();
            console.log('可用的 genre seeds 數量:', availableGenres.genres?.length);
            
            if (!availableGenres.genres || availableGenres.genres.length === 0) {
              throw new Error('無法獲取有效的 genre seeds 列表');
            }
            
            // 2. 分析選擇的 genre 以及可能的相關 genre
            let selectedGenres = filters.genre.split(',');
            
            // 可以添加相關 genre 擴充搜尋範圍
            const genrePairs: Record<string, string[]> = {
              'pop': ['dance', 'electronic'],
              'rock': ['alternative', 'indie'],
              'hip-hop': ['r-n-b', 'urban'],
              'jazz': ['blues', 'soul'],
              'classical': ['piano', 'orchestral'],
              'electronic': ['dance', 'house'],
              'r-n-b': ['soul', 'urban'],
              'indie': ['alternative', 'rock'],
              'k-pop': ['pop', 'dance'],
              'dance': ['electronic', 'house']
            };
            
            // 添加相關 genre，但不超過總共 5 個 (Spotify 的限制)
            if (genrePairs[filters.genre]) {
              selectedGenres = [
                filters.genre,
                ...genrePairs[filters.genre].slice(0, Math.min(4, 5 - selectedGenres.length))
              ];
            }
            
            // 3. 過濾掉不在官方支援列表中的 genre
            const validGenres = selectedGenres
              .map(g => g.trim().toLowerCase())
              .filter(g => availableGenres.genres.includes(g));
            
            console.log('選擇的 genres:', selectedGenres);
            console.log('有效的 genres:', validGenres);
            
            // 4. 如果有有效的 genre，使用 Recommendations API
            if (validGenres.length > 0) {
              console.log('使用有效的 genre seeds 進行推薦:', validGenres.join(','));
              const recommendations = await spotifyService.getRecommendations(
                validGenres.join(','),  // 使用逗號分隔的有效 genre 列表
                undefined,              // 不使用 seed_tracks
                20                     // 限制 20 筆
              );
              
              if (recommendations && recommendations.tracks) {
                result = {
                  tracks: recommendations.tracks,
                  total: recommendations.tracks.length * 5, // 假設有 5 頁
                };
              } else {
                throw new Error('Recommendations API 返回無效結果');
              }
            } else {
              // 5. 如果沒有有效的 genre，改用 Search API 的進階搜尋語法
              throw new Error('沒有有效的 genre seeds');
            }
          } catch (error) {
            console.error('推薦獲取失敗:', error);
            
            // 備用方案：無論什麼錯誤，都改用 Search API 的進階搜尋
            console.log('改用進階搜尋:', `genre:${filters.genre}`);
            try {
              const searchResult = await spotifyService.searchTracks(`genre:${filters.genre}`, 20, offset);
              result = {
                tracks: searchResult.tracks.items,
                total: searchResult.tracks.total,
              };
            } catch (searchError) {
              console.error('進階搜尋也失敗:', searchError);
              throw searchError;
            }
          }
        } else {
          // 沒有任何過濾條件，可以選擇返回熱門歌曲或空結果
          result = {
            tracks: [],
            total: 0,
          };
        }

        dispatch({ type: 'SET_TRACKS', payload: result });
      } catch (error) {
        console.error('Error loading tracks:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to load tracks' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
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