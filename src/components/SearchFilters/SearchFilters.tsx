import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { spotifyService } from '../../services/spotify';
import styles from './SearchFilters.module.scss';

export function SearchFilters() {
  const { state, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genres, setGenres] = useState<string[]>([]);

  useEffect(() => {
    // 載入流派列表
    const loadGenres = async () => {
      try {
        if (spotifyService.isAuthenticated()) {
          const genreList = await spotifyService.getGenres();
          setGenres(genreList.slice(0, 50)); // 限制數量
        }
      } catch (error) {
        console.error('Error loading genres:', error);
      }
    };

    loadGenres();
  }, []);

  const handleSearch = () => {
    dispatch({
      type: 'SET_FILTERS',
      payload: {
        query: searchQuery,
        genre: selectedGenre,
      },
    });
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedGenre('');
    dispatch({ type: 'SET_FILTERS', payload: {} });
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
        >
          <option value="">所有類型</option>
          {genres.map(genre => (
            <option key={genre} value={genre}>
              {genre.charAt(0).toUpperCase() + genre.slice(1)}
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