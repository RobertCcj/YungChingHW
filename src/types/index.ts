// Spotify API 回傳的部分結構
export interface Track {
  id: string;
  name: string;
  artists: { name: string; id: string }[];
  album: {
    images: { url: string; height: number; width: number }[];
    name: string;
  };
  preview_url: string | null;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
}

// 收藏項目
export interface FavoriteTrack extends Track {
  note: string; // 使用者自訂備註
  userId: string;
  savedAt: string; // timestamp
}

// 分頁資料
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  next?: string;
  previous?: string;
}

// Spotify API 回應格式
export interface SpotifySearchResponse {
  tracks: {
    items: Track[];
    total: number;
    limit: number;
    offset: number;
    next: string | null;
    previous: string | null;
  };
}

// 篩選選項
export interface FilterOptions {
  genre?: string;
  artist?: string;
  query?: string;
}

// 應用狀態
export interface AppState {
  tracks: Track[];
  favorites: FavoriteTrack[];
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  filters: FilterOptions;
  user: any | null;
}

// Action類型
export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TRACKS'; payload: { tracks: Track[]; total: number } }
  | { type: 'SET_FAVORITES'; payload: FavoriteTrack[] }
  | { type: 'ADD_FAVORITE'; payload: FavoriteTrack }
  | { type: 'REMOVE_FAVORITE'; payload: string }
  | { type: 'UPDATE_FAVORITE'; payload: { id: string; note: string } }
  | { type: 'SET_FILTERS'; payload: FilterOptions }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SET_USER'; payload: any | null };