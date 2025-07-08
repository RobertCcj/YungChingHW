import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { spotifyService } from '../../services/spotify';

export function CallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        console.error('Spotify auth error:', error);
        navigate('/explore');
        return;
      }

      if (code) {
        try {
          await spotifyService.exchangeCodeForToken(code);
          navigate('/explore');
        } catch (error) {
          console.error('Token exchange error:', error);
          navigate('/explore');
        }
      } else {
        navigate('/explore');
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '1.125rem',
      color: '#6b7280'
    }}>
      正在處理 Spotify 授權...
    </div>
  );
}