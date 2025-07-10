import React, { useState } from 'react';
import { Track, FavoriteTrack } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { firebaseService, auth } from '../../services/firebase';
import styles from './TrackCard.module.scss';

interface TrackCardProps {
  track: Track | FavoriteTrack;
  isFavorite?: boolean;
  showNoteEditor?: boolean;
}

export function TrackCard({ track, isFavorite = false, showNoteEditor = false }: TrackCardProps) {
  const { dispatch } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('note' in track ? track.note || '' : '');
  const [alias, setAlias] = useState('alias' in track ? track.alias || track.name || '' : track.name || '');
  const [rating, setRating] = useState('rating' in track && typeof track.rating === 'number' ? track.rating : 3);
  const [errors, setErrors] = useState<{ alias?: string; rating?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 驗證表單資料
  const validate = () => {
    const newErrors: { alias?: string; rating?: string } = {};
    
    // 驗證自訂標題（必填）
    if (!alias.trim()) {
      newErrors.alias = '自訂標題為必填欄位';
    }
    
    // 驗證評分（1-5整數）
    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      newErrors.rating = '評分必須是1至5的整數';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFavoriteToggle = async () => {
    if (!auth.currentUser) return;

    setIsLoading(true);
    try {
      if (isFavorite) {
        await firebaseService.removeFavorite(track.id, auth.currentUser.uid);
        dispatch({ type: 'REMOVE_FAVORITE', payload: track.id });
      } else {
        // 添加收藏時預設必填欄位
        const favoriteTrack: FavoriteTrack = {
          ...track,
          alias: track.name || '未命名歌曲', // 預設自訂標題
          rating: 3, // 預設評分
          note: '',
          userId: auth.currentUser.uid,
          savedAt: new Date().toISOString(),
        };
        await firebaseService.addFavorite(favoriteTrack);
        dispatch({ type: 'ADD_FAVORITE', payload: favoriteTrack });
      }
    } catch (error) {
      console.error('切換收藏狀態失敗:', error);
      dispatch({ type: 'SET_ERROR', payload: '更新收藏失敗' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) {
      return; // 驗證失敗不進行儲存
    }
    
    setIsLoading(true);
    try {
      if (!auth.currentUser) {
        throw new Error('使用者未登入');
      }
      
      await firebaseService.updateFavoriteNote(
        track.id,
        auth.currentUser.uid,
        {
          alias,
          rating: Number(rating),
          note: noteText
        }
      );
      
      dispatch({
        type: 'UPDATE_FAVORITE',
        payload: { 
          id: track.id, 
          alias, 
          rating: Number(rating), 
          note: noteText 
        },
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000); // 2秒後隱藏成功訊息
      setIsEditing(false);
    } catch (error) {
      console.error('更新最愛失敗', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // 還原原始值
    setNoteText('note' in track ? track.note || '' : '');
    setAlias('alias' in track ? track.alias || track.name || '' : track.name || '');
    setRating('rating' in track && typeof track.rating === 'number' ? track.rating : 3);
    setErrors({});
    setIsEditing(false);
  };

  const handlePreview = () => {
    if (track.preview_url) {
      const audio = new Audio(track.preview_url);
      audio.play();
    }
  };

  const albumImage = track.album.images[0]?.url || '';

  return (
    <div className={styles.trackCard}>
      <div className={styles.trackInfo}>
        {albumImage && (
          <img
            src={albumImage}
            alt={track.album.name}
            className={styles.albumCover}
          />
        )}
        <div className={styles.trackDetails}>
          <h3 className={styles.trackName}>{track.name}</h3>
          <p className={styles.artistName}>
            {track.artists.map(artist => artist.name).join(', ')}
          </p>
          <p className={styles.albumName}>{track.album.name}</p>
        </div>
      </div>

      <div className={styles.trackActions}>
        <button
          className={`${styles.favoriteButton} ${isFavorite ? styles.favorited : ''}`}
          onClick={handleFavoriteToggle}
          disabled={isLoading}
        >
          {isLoading ? '...' : isFavorite ? '♥ 已收藏' : '♡ 加入收藏'}
        </button>

        <button
          className={styles.previewButton}
          onClick={handlePreview}
          disabled={!track.preview_url}
        >
          {track.preview_url ? '🎵 試聽' : '無試聽'}
        </button>
      </div>

      {/* 整合後的編輯區域 - 只有在是收藏且showNoteEditor為true時顯示 */}
      {isFavorite && showNoteEditor && (
        <div className={styles.editSection}>
          {!isEditing && (
            <>
              {/* 顯示已儲存的詳細資訊 */}
              <div className={styles.noteDisplay}>
                {'alias' in track && track.alias && <p><strong>自訂標題:</strong> {track.alias}</p>}
                {'rating' in track && track.rating !== undefined && (
                  <p><strong>評分:</strong> {track.rating}/5</p>
                )}
                {'note' in track && track.note && <p><strong>備註:</strong> {track.note}</p>}
              </div>
              
              {/* 編輯按鈕 */}
              <button
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                編輯詳細資訊
              </button>
            </>
          )}

          {/* 編輯表單 - 整合了所有編輯功能 */}
          {isEditing && (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label htmlFor="alias">自訂標題 (必填):</label>
                <input
                  id="alias"
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  className={errors.alias ? styles.inputError : ''}
                />
                {errors.alias && <p className={styles.errorText}>{errors.alias}</p>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="rating">評分 (1-5):</label>
                <div className={styles.ratingInput}>
                  <input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className={errors.rating ? styles.inputError : ''}
                  />
                  <span>/5</span>
                </div>
                {errors.rating && <p className={styles.errorText}>{errors.rating}</p>}
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="note">備註:</label>
                <textarea
                  id="note"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="加入筆記..."
                  rows={3}
                />
              </div>
              
              <div className={styles.editActions}>
                <button 
                  onClick={handleSave} 
                  disabled={isLoading}
                  className={styles.saveBtn}
                >
                  {isLoading ? '儲存中...' : '儲存'}
                </button>
                <button 
                  onClick={handleCancelEdit} 
                  className={styles.cancelBtn}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          {/* 成功提示 */}
          {saveSuccess && (
            <div className={styles.successMessage}>已儲存 ✓</div>
          )}
        </div>
      )}
    </div>
  );
}