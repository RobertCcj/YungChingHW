import axios from 'axios';
import { SpotifySearchResponse, Track } from '../types';

const CLIENT_ID = '81f2d1a5a4dd4cafa8560ec2f6ead928'; // 請替換為您的 Spotify Client ID
const REDIRECT_URI = window.location.origin + '/callback';
const SCOPES = 'user-read-private user-read-email';

export const spotifyService = {
  accessToken: null as string | null,

  // 獲取授權URL
  async getAuthUrl(): Promise<string> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // 統一 localStorage key
    localStorage.setItem('spotify_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    return `https://accounts.spotify.com/authorize?${params}`;
  },

  // 交換訪問令牌
  async exchangeCodeForToken(code: string, codeVerifier: string) {
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('code_verifier', codeVerifier);

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Failed to exchange code for token');
    }

    const data = await response.json();
    // 儲存 access_token、refresh_token 等
    localStorage.setItem('spotify_access_token', data.access_token);
    if (data.refresh_token) {
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
    }
    return data;
  },

  // 取得 access token，必要時自動 refresh
  async getAccessToken(): Promise<string> {
    let accessToken = localStorage.getItem('spotify_access_token');
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!accessToken && refreshToken) {
      // 沒有 access token 但有 refresh token，自動 refresh
      await this.refreshAccessToken();
      accessToken = localStorage.getItem('spotify_access_token');
    }
    if (!accessToken) throw new Error('Not authenticated');
    return accessToken;
  },

  // 用 refresh token 換新 access token
  async refreshAccessToken(): Promise<void> {
    const refreshToken = localStorage.getItem('spotify_refresh_token');
    if (!refreshToken) throw new Error('No refresh token');
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      const newAccessToken = response.data.access_token;
      if (newAccessToken) {
        localStorage.setItem('spotify_access_token', newAccessToken);
      }
      // 有些情況會回傳新的 refresh token
      if (response.data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', response.data.refresh_token);
      }
    } catch {
      // refresh 失敗，清除 token
      localStorage.removeItem('spotify_access_token');
      localStorage.removeItem('spotify_refresh_token');
      throw new Error('Spotify 權杖已過期，請重新登入');
    }
  },

  // 搜索歌曲
  async searchTracks(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SpotifySearchResponse> {
    let accessToken = await this.getAccessToken();
    try {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          q: query,
          type: 'track',
          limit,
          offset,
        },
      });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        // 嘗試 refresh token 並重試一次
        await this.refreshAccessToken();
        accessToken = await this.getAccessToken();
        const response = await axios.get('https://api.spotify.com/v1/search', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            q: query,
            type: 'track',
            limit,
            offset,
          },
        });
        return response.data;
      }
      throw error;
    }
  },

  // 獲取推薦歌曲
  async getRecommendations(
    genre?: string,
    artistId?: string,
    limit: number = 20
  ): Promise<{ tracks: Track[] }> {
    let accessToken = await this.getAccessToken();
    const params: any = { limit };
    if (genre) params.seed_genres = genre;
    if (artistId) params.seed_artists = artistId;
    if (!genre && !artistId) params.seed_genres = 'pop';

    try {
      const response = await axios.get('https://api.spotify.com/v1/recommendations', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      });
      return response.data;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await this.refreshAccessToken();
        accessToken = await this.getAccessToken();
        const response = await axios.get('https://api.spotify.com/v1/recommendations', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        });
        return response.data;
      }
      throw error;
    }
  },

  // 獲取流派列表
  async getGenres(): Promise<string[]> {
    let accessToken = await this.getAccessToken();
    try {
      const response = await axios.get(
        'https://api.spotify.com/v1/recommendations/available-genre-seeds',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      return response.data.genres;
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await this.refreshAccessToken();
        accessToken = await this.getAccessToken();
        const response = await axios.get(
          'https://api.spotify.com/v1/recommendations/available-genre-seeds',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        return response.data.genres;
      }
      throw error;
    }
  },

  // 移除 private，改為普通方法
  generateCodeVerifier(): string {
    const array = new Uint32Array(56);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  },

  async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    return base64;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('spotify_access_token');
  },

  logout(): void {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    this.accessToken = null;
  },
};