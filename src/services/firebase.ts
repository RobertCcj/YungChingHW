import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  updateDoc,
  setDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FavoriteTrack } from '../types';

// Firebase 配置 - 請填入您的實際 Firebase 專案資訊
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Firebase 服務類別
class FirebaseService {
  // 獲取使用者收藏
  async getFavorites(userId: string): Promise<FavoriteTrack[]> {
    try {
      const q = query(
        collection(db, 'favorites'),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      const favorites: FavoriteTrack[] = [];
      
      querySnapshot.forEach((doc) => {
        favorites.push(doc.data() as FavoriteTrack);
      });
      
      return favorites;
    } catch (error) {
      console.error('獲取收藏失敗:', error);
      throw error;
    }
  }

  // 添加收藏
  async addFavorite(track: FavoriteTrack): Promise<void> {
    try {
      // 使用組合 ID 作為文件 ID
      const docId = `${track.userId}_${track.id}`;
      
      // 使用 setDoc 替代 updateDoc，因為它會在文件不存在時創建新文件
      await setDoc(doc(db, 'favorites', docId), track);
    } catch (error) {
      console.error('添加收藏失敗:', error);
      throw error;
    }
  }

  // 移除收藏
  async removeFavorite(trackId: string, userId: string): Promise<void> {
    try {
      // 使用組合 ID 直接刪除
      const docId = `${userId}_${trackId}`;
      await deleteDoc(doc(db, 'favorites', docId));
    } catch (error) {
      console.error('移除收藏失敗:', error);
      throw error;
    }
  }

  // 更新收藏備註 - 擴充支援多欄位更新
  async updateFavoriteNote(
    trackId: string,
    userId: string,
    data: { note?: string; alias?: string; rating?: number }
  ): Promise<void> {
    try {
      // 使用組合 ID 直接更新
      const docId = `${userId}_${trackId}`;
      await updateDoc(doc(db, 'favorites', docId), data);
    } catch (error) {
      console.error('更新收藏詳情失敗:', error);
      throw error;
    }
  }

  // 為保持向後兼容性，也添加一個 updateFavorite 方法作為別名
  async updateFavorite(...args: Parameters<typeof this.updateFavoriteNote>): Promise<void> {
    return this.updateFavoriteNote(...args);
  }
}

export const firebaseService = new FirebaseService();