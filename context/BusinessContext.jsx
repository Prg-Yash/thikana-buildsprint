"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

const DEFAULT_PERMISSIONS = {
  canViewAnalytics: true,
  canManageOrders: true,
  canManagePayments: true,
  canManagePlans: true,
  canManageTransactions: true,
  canManageContacts: true,
  canManageAiCalls: true,
  canManageSettings: true,
  canManageMembers: true,
};

// Seed fallback data for demo & instant interactivity
const SEED_HQ_BUSINESS = {
  id: "hq-main-001",
  name: "Thikana HQ - National Hub",
  type: "HQ",
  isHQ: true,
  city: "Mumbai, MH",
  address: "101 High Street Tower, Bandra Kurla Complex",
  phone: "+91 98765 43210",
  email: "hq@thikana.inc",
  logo: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=200",
  coordinates: { lat: 19.076, lng: 72.8777 },
  monthlyRevenue: 1245000,
  activeSubscribers: 1840,
  franchiseCount: 4,
};

const SEED_FRANCHISES = [
  {
    id: "fr-bandra-01",
    name: "Thikana Outlet - Bandra West",
    city: "Mumbai, MH",
    address: "Shop 4, Hill Road, Bandra West",
    adminName: "Rohan Varma",
    adminEmail: "rohan.varma@thikana.inc",
    phone: "+91 98201 11223",
    status: "Active",
    monthlyRevenue: 340000,
    ordersToday: 42,
    activeSubscribers: 420,
    rating: 4.8,
  },
  {
    id: "fr-indiranagar-02",
    name: "Thikana Outlet - Indiranagar",
    city: "Bengaluru, KA",
    address: "100 Feet Road, Indiranagar",
    adminName: "Ananya Rao",
    adminEmail: "ananya.rao@thikana.inc",
    phone: "+91 99802 33445",
    status: "Active",
    monthlyRevenue: 410000,
    ordersToday: 58,
    activeSubscribers: 590,
    rating: 4.9,
  },
  {
    id: "fr-cp-03",
    name: "Thikana Outlet - Connaught Place",
    city: "New Delhi, DL",
    address: "Inner Circle, Block C, Connaught Place",
    adminName: "Vikram Malhotra",
    adminEmail: "vikram.m@thikana.inc",
    phone: "+91 98110 55667",
    status: "Active",
    monthlyRevenue: 295000,
    ordersToday: 35,
    activeSubscribers: 310,
    rating: 4.6,
  },
  {
    id: "fr-pune-04",
    name: "Thikana Outlet - Koregaon Park",
    city: "Pune, MH",
    address: "North Main Road, Koregaon Park",
    adminName: "Pooja Deshmukh",
    adminEmail: "pooja.d@thikana.inc",
    phone: "+91 97654 77889",
    status: "Pending Acceptance",
    monthlyRevenue: 200000,
    ordersToday: 19,
    activeSubscribers: 220,
    rating: 4.5,
  },
];

const BusinessContext = createContext({
  business: null,
  activeBusinessId: null,
  activeBusinessData: null,
  isHQ: true,
  isHeadquarters: true,
  isFranchise: false,
  isHQView: true,
  isSwitchedView: false,
  franchises: [],
  userData: null,
  userRole: "Admin",
  permissions: DEFAULT_PERMISSIONS,
  switchFranchise: () => {},
  switchToFranchise: () => {},
  returnToHQ: () => {},
  addFranchise: () => {},
  deactivateFranchise: () => {},
  loading: false,
  hasGeoLocation: false,
});

export const BusinessProvider = ({ children }) => {
  const { user } = useAuth();
  
  const [hqBusiness, setHqBusiness] = useState(SEED_HQ_BUSINESS);
  const [franchises, setFranchises] = useState(SEED_FRANCHISES);
  const [activeBusinessId, setActiveBusinessId] = useState(SEED_HQ_BUSINESS.id);
  const [switchedFranchise, setSwitchedFranchise] = useState(null);
  const [loading, setLoading] = useState(false);

  // Firestore Real-Time Listener for Business Document AND Franchises Subcollection
  useEffect(() => {
    if (!user?.uid) return;

    // 1. Listen to HQ business document
    const unsubDoc = onSnapshot(
      doc(db, "businesses", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setHqBusiness({ id: docSnap.id, ...data });
          if (!switchedFranchise) {
            setActiveBusinessId(docSnap.id);
          }
        }
      },
      (err) => console.log("Business snapshot note:", err)
    );

    // 2. Listen to Franchises subcollection: businesses/{user.uid}/franchises
    const franchisesRef = collection(db, "businesses", user.uid, "franchises");
    const unsubFranchises = onSnapshot(
      franchisesRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || data.franchiseName || "Franchise Outlet",
              city: data.city || "Mumbai, MH",
              address: data.address || "Main Street Outlet",
              adminName: data.adminName || "Store Manager",
              adminEmail: data.adminEmail || "admin@thikana.inc",
              phone: data.phone || "+91 98000 00000",
              status: data.status || "Active",
              monthlyRevenue: data.monthlyRevenue || 250000,
              ordersToday: data.ordersToday || 20,
              activeSubscribers: data.activeSubscribers || 150,
              rating: data.rating || 4.8,
            };
          });

          // Merge DB list with seeds if needed to guarantee comprehensive list
          setFranchises(list);
        }
      },
      (err) => console.log("Franchises subcollection note:", err)
    );

    return () => {
      unsubDoc();
      unsubFranchises();
    };
  }, [user?.uid, switchedFranchise]);

  const isSwitchedView = Boolean(switchedFranchise);
  const isHQ = Boolean(hqBusiness?.isHQ ?? true);
  const isHQView = isHQ && !isSwitchedView;

  const isHeadquarters = isHQView;
  const isFranchise = !isHQView;

  const activeBusinessData = useMemo(() => {
    if (isSwitchedView && switchedFranchise) {
      return {
        ...switchedFranchise,
        isHQ: false,
        type: "Scoped Franchise Outlet",
      };
    }
    return hqBusiness;
  }, [isSwitchedView, switchedFranchise, hqBusiness]);

  const switchFranchise = (franchiseId) => {
    if (!franchiseId || franchiseId === hqBusiness?.id) {
      returnToHQ();
      return;
    }
    const found = franchises.find((f) => f.id === franchiseId || f.name === franchiseId?.name);
    if (found) {
      setSwitchedFranchise(found);
      setActiveBusinessId(found.id);
    }
  };

  const switchToFranchise = (franchiseObj) => {
    if (!franchiseObj) return;
    if (typeof franchiseObj === "string") {
      switchFranchise(franchiseObj);
    } else if (franchiseObj.id) {
      setSwitchedFranchise(franchiseObj);
      setActiveBusinessId(franchiseObj.id);
    }
  };

  const returnToHQ = () => {
    setSwitchedFranchise(null);
    setActiveBusinessId(hqBusiness?.id || "hq-main-001");
  };

  const addFranchise = (newFranchise) => {
    const created = {
      id: `fr-custom-${Date.now()}`,
      status: "Pending Acceptance",
      monthlyRevenue: 0,
      ordersToday: 0,
      activeSubscribers: 0,
      rating: 5.0,
      ...newFranchise,
    };
    setFranchises((prev) => [created, ...prev]);
    return created;
  };

  const deactivateFranchise = (franchiseId) => {
    setFranchises((prev) =>
      prev.map((f) => (f.id === franchiseId ? { ...f, status: "Deactivated" } : f))
    );
    if (activeBusinessId === franchiseId) {
      returnToHQ();
    }
  };

  const hasGeoLocation = Boolean(
    activeBusinessData?.coordinates?.lat && activeBusinessData?.coordinates?.lng
  );

  return (
    <BusinessContext.Provider
      value={{
        business: hqBusiness,
        activeBusinessId,
        activeBusinessData,
        isHQ,
        isHeadquarters,
        isFranchise,
        isHQView,
        isSwitchedView,
        franchises,
        userData: user,
        userRole: user?.role || "Admin",
        permissions: user?.permissions || DEFAULT_PERMISSIONS,
        switchFranchise,
        switchToFranchise,
        returnToHQ,
        addFranchise,
        deactivateFranchise,
        loading,
        hasGeoLocation,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => useContext(BusinessContext);
export const useBusinessContext = () => useContext(BusinessContext);
