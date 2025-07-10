import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { spotifyService } from '../../services/spotify';
import styles from './SearchFilters.module.scss';

// 修改為 Genre 介面
interface Genre {
  id: string;
  name: string;
}

// 預設 genres 列表，確保即使 API 調用失敗也有選項
const defaultGenres: Genre[] = [
  { id: 'pop', name: '流行音樂' },
  { id: 'rock', name: '搖滾音樂' },
  { id: 'hip-hop', name: '嘻哈音樂' },
  { id: 'jazz', name: '爵士樂' },
  { id: 'classical', name: '古典音樂' },
  { id: 'electronic', name: '電子音樂' },
  { id: 'r-n-b', name: 'R&B' },
  { id: 'indie', name: '獨立音樂' },
  { id: 'k-pop', name: '韓流音樂' },
  { id: 'dance', name: '舞曲' }
];

export function SearchFilters() {
  const { state, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genres, setGenres] = useState<Genre[]>(defaultGenres); // 使用預設列表
  const [isLoadingGenres, setIsLoadingGenres] = useState(false); // 變更為 false，因為有預設值

  useEffect(() => {
    // 從 API 載入 genres
    const loadGenres = async () => {
      setIsLoadingGenres(true);
      try {
        if (spotifyService.isAuthenticated()) {
          const availableGenres = await spotifyService.getAvailableGenreSeeds();
          if (availableGenres && availableGenres.genres && availableGenres.genres.length > 0) {
            const formattedGenres = availableGenres.genres.map(genre => ({
              id: genre,
              name: genre.charAt(0).toUpperCase() + genre.slice(1).replace(/-/g, ' ')
            }));
            setGenres(formattedGenres);
          }
        }
      } catch (error) {
        console.error('Error loading genres:', error);
        // 出錯時繼續使用預設列表，無需其他操作
      } finally {
        setIsLoadingGenres(false);
      }
    };

    loadGenres();
  }, []);

  const handleSearch = () => {
    // 構建搜尋條件，同時包含 query 和 genre
    const payload: any = {};
    
    if (searchQuery) {
      payload.query = searchQuery;
    }
    
    if (selectedGenre) {
      payload.genre = selectedGenre; // 添加 genre 參數
    }
    
    dispatch({
      type: 'SET_FILTERS',
      payload: payload
    });
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedGenre('');
    dispatch({ type: 'SET_FILTERS', payload: {} });
    dispatch({ type: 'SET_TRACKS', payload: { tracks: [], total: 0 } });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className={styles.searchFilters}>
      <h2 className={styles.filterTitle}>搜尋與篩選</h2>
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="輸入歌曲名稱或藝人名稱..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <select
          className={styles.filterSelect}
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          disabled={isLoadingGenres}
        >
          <option value="">所有類型</option>
          {genres.map(genre => (
            <option key={genre.id} value={genre.id}>
              {genre.name}
            </option>
          ))}
        </select>
        <button className={styles.clearButton} onClick={handleClear}>
          清除篩選
        </button>
        <button className={styles.searchButton} onClick={handleSearch}>
          搜尋
        </button>
      </div>
    </div>
  );
}