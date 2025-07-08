import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, User } from 'firebase/auth';
import { FavoriteTrack, Track } from '../types';

const firebaseConfig = {
  // 請替換為您的 Firebase 配置
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

class FirebaseService {
  // 匿名登入
  async signInAnonymously(): Promise<User> {
    const result = await signInAnonymously(auth);
    return result.user;
  }

  // 添加最愛
  async addFavorite(track: Track, note: string = ''): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    const favoriteData = {
      ...track,
      note,
      userId: user.uid,
      savedAt: Timestamp.now().toDate().toISOString(),
    };

    await addDoc(collection(db, 'favorites'), favoriteData);
  }

  // 獲取最愛列表
  async getFavorites(userId: string): Promise<FavoriteTrack[]> {
    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', userId),
      orderBy('savedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      ...doc.data(),
      firestoreId: doc.id,
    })) as FavoriteTrack[];
  }

  // 移除最愛
  async removeFavorite(trackId: string, userId: string): Promise<void> {
    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', userId),
      where('id', '==', trackId)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.docs.forEach(async (docSnapshot) => {
      await deleteDoc(doc(db, 'favorites', docSnapshot.id));
    });
  }

  // 更新最愛備註
  async updateFavoriteNote(trackId: string, userId: string, note: string): Promise<void> {
    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', userId),
      where('id', '==', trackId)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.docs.forEach(async (docSnapshot) => {
      await updateDoc(doc(db, 'favorites', docSnapshot.id), { note });
    });
  }
}

export const firebaseService = new FirebaseService();