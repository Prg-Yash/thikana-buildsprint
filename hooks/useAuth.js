"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  GoogleAuthProvider, 
  signInWithPopup 
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          let bizData = {};
          try {
            const bizDoc = await getDoc(doc(db, "businesses", firebaseUser.uid));
            if (bizDoc.exists()) {
              bizData = bizDoc.data();
            }
          } catch {
            // Ignore
          }

          const resolvedName =
            userData.name ||
            userData.displayName ||
            userData.fullName ||
            bizData.businessName ||
            firebaseUser.displayName ||
            "User";

          const resolvedAvatar =
            userData.profilePic ||
            userData.avatar ||
            bizData.profilePic ||
            firebaseUser.photoURL ||
            "";

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: resolvedName,
            name: resolvedName,
            photoURL: resolvedAvatar,
            profilePic: resolvedAvatar,
            ...userData,
            ...bizData,
          });
        } catch {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || "User",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const signup = async (email, password, fullName, accountType = "consumer") => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email,
      fullName,
      accountType,
      createdAt: new Date().toISOString(),
    });
    return userCredential;
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const userDoc = await getDoc(doc(db, "users", result.user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, "users", result.user.uid), {
        uid: result.user.uid,
        email: result.user.email,
        fullName: result.user.displayName || "",
        accountType: "consumer",
        createdAt: new Date().toISOString(),
      });
    }
    return result;
  };

  const logout = async () => {
    return signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
