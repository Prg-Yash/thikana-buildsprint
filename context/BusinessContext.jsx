"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const BusinessContext = createContext({
  business: null,
  loading: true,
  hasGeoLocation: false,
});

export const BusinessProvider = ({ children }) => {
  const { user } = useAuth();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setBusiness(null);
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "businesses", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setBusiness(docSnap.data());
        } else {
          setBusiness(null);
        }
        setLoading(false);
      },
      () => {
        setBusiness(null);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const hasGeoLocation = Boolean(
    business?.coordinates?.lat && business?.coordinates?.lng
  );

  return (
    <BusinessContext.Provider value={{ business, loading, hasGeoLocation }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => useContext(BusinessContext);
