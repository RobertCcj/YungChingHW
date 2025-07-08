import axios from 'axios';
import { SpotifySearchResponse, Track } from '../types';

const CLIENT_ID = 'your_spotify_client_id'; // 請替換為您的 Spotify Client ID
const REDIRECT_URI = window.location.origin + '/callback';
const SCOPES = 'user-read-private user-read-email';

class SpotifyService {
  private accessToken: string | null = null;

  // 獲取授權URL
  getAuthUrl(): string {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    localStorage.setItem('code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    return `https://accounts.spotify.com/authorize?${params}`;
  }

  // 交換訪問令牌
  async exchangeCodeForToken(code: string): Promise<void> {
    const codeVerifier = localStorage.getItem('code_verifier');
    if (!codeVerifier) {
      throw new Error('Code verifier not found');
    }

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    this.accessToken = response.data.access_token;
    localStorage.setItem('spotify_access_token', this.accessToken);
    localStorage.setItem('spotify_refresh_token', response.data.refresh_token);
    localStorage.removeItem('code_verifier');
  }

  // 搜索歌曲
  async searchTracks(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<SpotifySearchResponse> {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('spotify_access_token');
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
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

  // 獲取推薦歌曲
  async getRecommendations(
    genre?: string,
    artistId?: string,
    limit: number = 20
  ): Promise<{ tracks: Track[] }> {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('spotify_access_token');
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const params: any = { limit };
    if (genre) params.seed_genres = genre;
    if (artistId) params.seed_artists = artistId;
    if (!genre && !artistId) params.seed_genres = 'pop';

    const response = await axios.get('https://api.spotify.com/v1/recommendations', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      params,
    });

    return response.data;
  }

  // 獲取流派列表
  async getGenres(): Promise<string[]> {
    if (!this.accessToken) {
      this.accessToken = localStorage.getItem('spotify_access_token');
    }

    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(
      'https://api.spotify.com/v1/recommendations/available-genre-seeds',
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    return response.data.genres;
  }

  private generateCodeVerifier(): string {
    const array = new Uint32Array(56);
    crypto.getRandomValues(array);
    return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
  }

  private generateCodeChallenge(verifier: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    return window.crypto.subtle.digest('SHA-256', data).then(digest => {
      const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      return base64;
    });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('spotify_access_token');
  }

  logout(): void {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    this.accessToken = null;
  }
}

export const spotifyService = new SpotifyService();