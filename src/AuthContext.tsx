import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, getDoc, updateDoc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { GOV_CATEGORIES } from './constants';

interface AuthContextType {
  user: User | null;
  role: string | null;
  loading: boolean;
  categories: any[];
  userData: any;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  role: null, 
  loading: true, 
  categories: GOV_CATEGORIES,
  userData: null
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>(GOV_CATEGORIES);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    let unsubUser: (() => void) | null = null;

    // 1. Snapshot for categories from Firestore
    const unsubCats = onSnapshot(collection(db, 'categories'), (snapshot) => {
      const cats: any[] = [];
      snapshot.forEach((docSnap) => {
        cats.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (cats.length > 0) {
        setCategories(cats);
      } else {
        setCategories(GOV_CATEGORIES);
      }
    }, (error) => {
      console.error('Category sync failed:', error);
      setCategories(GOV_CATEGORIES);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clear previous user listener if it exists
      if (unsubUser) {
        unsubUser();
        unsubUser = null;
      }

      setUser(user);
      if (user) {
        const userEmail = user.email?.toLowerCase();
        const isOwner = userEmail === 'personal@finwuh.uk';
        
        if (isOwner) {
          setRole('owner');
          // Ownership background sync
          try {
            await updateDoc(doc(db, 'users', user.uid), {
              email: user.email,
              displayName: user.displayName,
              role: 'owner',
              lastLogin: new Date().toISOString()
            }).catch(async (e) => {
              if (e.code === 'not-found') {
                await setDoc(doc(db, 'users', user.uid), {
                  email: user.email,
                  displayName: user.displayName,
                  role: 'owner',
                  lastLogin: new Date().toISOString(),
                  isAdopted: false,
                  createdAt: new Date().toISOString()
                });
              } else throw e;
            });
            await setDoc(doc(db, 'settings', 'maintenanceMode'), { value: false });
          } catch (e) {
            console.warn('Owner background sync error:', e);
          }
          setLoading(false);
          return;
        }

        // Listen for role changes in real-time
        const userRef = doc(db, 'users', user.uid);
        unsubUser = onSnapshot(userRef, async (snapshot) => {
          if (snapshot.exists()) {
            setRole(snapshot.data().role || 'user');
            setUserData(snapshot.data());
          } else {
            // New user: check if an admin pre-authorized this email
            try {
              const usersRef = collection(db, 'users');
              const q = query(usersRef, where('email', '==', user.email));
              const allUsersSnap = await getDocs(q);
              
              let preAuthRole = 'user';
              let preAuthDisplayName = user.displayName || user.email?.split('@')[0];
              let preAuthId = null;

              if (!allUsersSnap.empty) {
                const uDoc = allUsersSnap.docs[0];
                const uData = uDoc.data();
                preAuthRole = uData.role || 'user';
                preAuthDisplayName = uData.displayName || preAuthDisplayName;
                preAuthId = uDoc.id;
              }

              // Create/Update the record with the correct UID
              const newUserData: any = {
                email: user.email,
                displayName: preAuthDisplayName,
                role: preAuthRole,
                createdAt: new Date().toISOString(),
                isAdopted: preAuthId !== null
              };
              if (preAuthId) {
                newUserData.preAuthId = preAuthId;
              }

              await setDoc(doc(db, 'users', user.uid), newUserData);

              setRole(preAuthRole as any);

              // If we adopted a record, we should try to delete the old one to avoid duplicates
              if (preAuthId && preAuthId !== user.uid) {
                try {
                  await deleteDoc(doc(db, 'users', preAuthId));
                } catch (cleanupErr) {
                   console.log('Skipping pre-auth cleanup due to permissions', cleanupErr);
                }
              }
            } catch (e) {
              console.error('Registration error:', e);
              setRole('user');
            }
          }
          setLoading(false);
        }, (err) => {
          console.error('Role sync error:', err);
          setRole('user');
          setLoading(false);
        });
      } else {
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      unsubCats();
      if (unsubUser) unsubUser();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading, categories, userData }}>
      {children}
    </AuthContext.Provider>
  );
};
