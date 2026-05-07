import { doc, getDocs, collection, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { GOV_CATEGORIES } from '../constants';

export async function initCategories(force = false) {
  try {
    const catsRef = collection(db, 'categories');
    const snapshot = await getDocs(catsRef);
    
    if (snapshot.empty || force) {
      console.log(force ? 'Forcing category initialization...' : 'Categories empty, attempting initialization...');
      for (const cat of GOV_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.slug), {
          ...cat,
          id: cat.slug
        });
      }
      console.log('Categories initialized successfully');
    } else {
      console.log('Categories already exist, skipping initialization');
    }
  } catch (e) {
    console.error('Category initialization failed:', e);
  }
}
