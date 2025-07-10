import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { spotifyService } from '../../services/spotify';
import styles from './SearchFilters.module.scss';

interface SpotifyCategory {
  id: string;
  name: string;
}

export function SearchFilters() {
  const { state, dispatch } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<SpotifyCategory[]>([]);

  useEffect(() => {
    // 載入 Spotify Categories
    const loadCategories = async () => {
      try {
        if (spotifyService.isAuthenticated()) {
          const res = await spotifyService.getCategories(); // 你需要實作 getCategories
          setCategories(res.slice(0, 50)); // 限制數量
        }
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    loadCategories();
  }, []);

  const handleSearch = () => {
    dispatch({
      type: 'SET_FILTERS',
      payload: {
        query: searchQuery,
      },
    });
  };

  const handleClear = () => {
    setSearchQuery('');
    setSelectedCategory('');
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
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">所有類型</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
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