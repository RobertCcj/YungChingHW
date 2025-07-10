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
    seed_genres: string,
    seed_tracks?: string,
    limit: number = 20
  ): Promise<any> {
    let accessToken = await this.getAccessToken();
    try {
      // 確保 seed_genres 格式正確
      let formattedGenre = seed_genres;
      
      // 只保留有效字符，移除任何可能導致 URL 格式錯誤的字符
      if (formattedGenre) {
        formattedGenre = formattedGenre.trim().toLowerCase();
      }
      
      // 建立參數，僅包含必要參數，不再添加額外調校參數
      const params = {
        limit: limit
      } as Record<string, string | number>;
      
      // 只有當 formattedGenre 有值時才加入參數
      if (formattedGenre) {
        params.seed_genres = formattedGenre;
      }
      
      if (seed_tracks) {
        params.seed_tracks = seed_tracks;
      }
      
      console.log('正在獲取推薦，參數:', params);
      console.log('完整 URL:', `https://api.spotify.com/v1/recommendations?` + 
        new URLSearchParams(params as Record<string, string>).toString());
      
      const response = await axios({
        method: 'GET',
        url: 'https://api.spotify.com/v1/recommendations',
        params: params,
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      console.log('API 響應狀態:', response.status);
      console.log('接收到的推薦曲目數量:', response.data.tracks?.length);
      
      return response.data;
    } catch (error: any) {
      // 詳細錯誤日誌
      console.error('推薦請求失敗:', error.message);
      console.error('請求 URL:', error.config?.url);
      console.error('請求參數:', error.config?.params);
      
      if (error.response) {
        console.error('響應狀態:', error.response.status);
        console.error('響應數據:', error.response.data);
      }
      
      // 處理認證錯誤
      if (error.response && error.response.status === 401) {
        await this.refreshAccessToken();
        accessToken = await this.getAccessToken();
        // 重新嘗試請求
        return this.getRecommendations(seed_genres, seed_tracks, limit);
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

  // 取得 Spotify Categories
  async getCategories(): Promise<{ id: string; name: string }[]> {
    let accessToken = await this.getAccessToken();
    try {
      const response = await axios.get(
        'https://api.spotify.com/v1/browse/categories',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            limit: 50, // 你可以根據需求調整
          },
        }
      );
      // 回傳 id 與 name
      return response.data.categories.items.map((item: any) => ({
        id: item.id,
        name: item.name,
      }));
    } catch (error: any) {
      if (error.response && error.response.status === 401) {
        await this.refreshAccessToken();
        accessToken = await this.getAccessToken();
        const response = await axios.get(
          'https://api.spotify.com/v1/browse/categories',
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            params: {
              limit: 50,
            },
          }
        );
        return response.data.categories.items.map((item: any) => ({
          id: item.id,
          name: item.name,
        }));
      }
      throw error;
    }
  },

  async getCategoryPlaylists(categoryId: string, offset = 0) {
    const accessToken = await this.getAccessToken();
    const response = await axios.get(
      `https://api.spotify.com/v1/browse/categories/${categoryId}/playlists`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit: 20,
          offset,
        },
      }
    );
    return {
      tracks: response.data.playlists.items, // 3. 這裡 tracks 是 playlist 陣列
      total: response.data.playlists.total,
    };
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

  // 添加到 spotify.ts 的 spotifyService 對象中
  async getAvailableGenreSeeds(): Promise<{genres: string[]}> {
    try {
      const response = await this.makeRequest('GET', '/recommendations/available-genre-seeds');
      return response;
    } catch (error) {
      console.error('Failed to get available genre seeds:', error);
      return { genres: [] }; // 返回空數組而不是拋出錯誤
    }
  },

  // 檢查並更新 makeRequest 方法
  async makeRequest(method: string, endpoint: string, data?: any): Promise<any> {
    try {
      // 確保 token 有效
      if (!this.accessToken) {
        const token = localStorage.getItem('spotify_access_token');
        if (token) {
          this.accessToken = token;
        } else {
          throw new Error('No access token available');
        }
      }
      
      const baseUrl = 'https://api.spotify.com/v1';
      const url = `${baseUrl}${endpoint}`; // 確保完整 URL 是正確的
      
      console.log('Making API request to:', url);
      
      const headers = {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axios({
        method,
        url,
        data,
        headers
      });
      
      return response.data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }
};