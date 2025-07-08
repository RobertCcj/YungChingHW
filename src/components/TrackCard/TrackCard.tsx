import React, { useState } from 'react';
import { Track, FavoriteTrack } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { firebaseService } from '../../services/firebase';
import { auth } from '../../services/firebase';
import styles from './TrackCard.module.scss';

interface TrackCardProps {
  track: Track | FavoriteTrack;
  isFavorite?: boolean;
  showNoteEditor?: boolean;
}

export function TrackCard({ track, isFavorite = false, showNoteEditor = false }: TrackCardProps) {
  const { dispatch } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState(
    'note' in track ? track.note || '' : ''
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleFavoriteToggle = async () => {
    if (!auth.currentUser) return;

    setIsLoading(true);
    try {
      if (isFavorite) {
        await firebaseService.removeFavorite(track.id, auth.currentUser.uid);
        dispatch({ type: 'REMOVE_FAVORITE', payload: track.id });
      } else {
        await firebaseService.addFavorite(track, '');
        const favoriteTrack: FavoriteTrack = {
          ...track,
          note: '',
          userId: auth.currentUser.uid,
          savedAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_FAVORITE', payload: favoriteTrack });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update favorite' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!auth.currentUser || !('note' in track)) return;

    setIsLoading(true);
    try {
      await firebaseService.updateFavoriteNote(track.id, auth.currentUser.uid, noteText);
      dispatch({ type: 'UPDATE_FAVORITE', payload: { id: track.id, note: noteText } });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating note:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update note' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setNoteText('note' in track ? track.note || '' : '');
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

      {showNoteEditor && 'note' in track && (
        <div className={styles.noteSection}>
          {isEditing ? (
            <>
              <textarea
                className={styles.noteInput}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="新增您的備註..."
                maxLength={500}
              />
              <div className={styles.noteActions}>
                <button
                  className={styles.saveButton}
                  onClick={handleSaveNote}
                  disabled={isLoading}
                >
                  {isLoading ? '儲存中...' : '儲存'}
                </button>
                <button
                  className={styles.cancelButton}
                  onClick={handleCancelEdit}
                  disabled={isLoading}
                >
                  取消
                </button>
              </div>
            </>
          ) : (
            <>
              {track.note && (
                <div className={styles.noteDisplay}>
                  {track.note}
                </div>
              )}
              <button
                className={styles.editButton}
                onClick={() => setIsEditing(true)}
              >
                {track.note ? '編輯備註' : '新增備註'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}