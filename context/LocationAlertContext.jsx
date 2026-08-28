"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/context/BusinessContext";

const LocationAlertContext = createContext({
  alertVisible: false,
  dismissAlert: () => {},
  showAlert: () => {},
});

export const LocationAlertProvider = ({ children }) => {
  const { user } = useAuth();
  const { business, hasGeoLocation, loading } = useBusiness();
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for persisted dismissal preference
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = localStorage.getItem("thikana_geo_alert_dismissed") === "true";
      setDismissed(isDismissed);
    }
  }, []);

  // Alert is visible if user is a business and hasn't configured store coordinates and hasn't dismissed it
  const isBusinessUser = user?.accountType === "business" || Boolean(business);
  const alertVisible = !loading && isBusinessUser && !hasGeoLocation && !dismissed;

  const dismissAlert = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("thikana_geo_alert_dismissed", "true");
    }
  };

  const showAlert = () => {
    setDismissed(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("thikana_geo_alert_dismissed");
    }
  };

  return (
    <LocationAlertContext.Provider value={{ alertVisible, dismissAlert, showAlert }}>
      {children}
    </LocationAlertContext.Provider>
  );
};

export const useLocationAlert = () => useContext(LocationAlertContext);
