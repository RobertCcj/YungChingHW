import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { AppState, AppAction } from '../types';

const initialState: AppState = {
  tracks: [],
  favorites: [],
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  filters: {},
  user: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_TRACKS':
      return {
        ...state,
        tracks: action.payload.tracks,
        loading: false,
        error: null,
        totalPages: Math.ceil(action.payload.total / 20),
      };
    case 'SET_FAVORITES':
      return { ...state, favorites: action.payload, loading: false, error: null };
    case 'ADD_FAVORITE':
      return {
        ...state,
        favorites: [...state.favorites, action.payload],
      };
    case 'REMOVE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.filter(fav => fav.id !== action.payload),
      };
    case 'UPDATE_FAVORITE':
      return {
        ...state,
        favorites: state.favorites.map(favorite =>
          favorite.id === action.payload.id
            ? { ...favorite, ...action.payload } // 合併所有更新的欄位
            : favorite
        ),
      };
    case 'SET_FILTERS':
      return { ...state, filters: action.payload, currentPage: 1 };
    case 'SET_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// 修改 FilterOptions 型別，加入 category
export type FilterOptions = {
  query?: string;
  category?: string; // 新增這一行
  // ...其他篩選條件
};

// initialState.filters 也不用改，維持 {}