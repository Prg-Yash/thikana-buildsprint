"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const FEED_CACHE_KEY = "thikana_feed_cache";
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export function useFeed(userId, initialLimit = 10) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [coords, setCoords] = useState(null);
  const [page, setPage] = useState(1);

  const isFetching = useRef(false);

  // Request browser geolocation
  const requestLocation = useCallback(() => {
    return new Promise((resolve) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        setLocationDenied(true);
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(location);
          setLocationDenied(false);
          resolve(location);
        },
        (err) => {
          console.warn("Browser geolocation denied/error:", err.message);
          setLocationDenied(true);
          setCoords(null);
          resolve(null);
        },
        { timeout: 15000, enableHighAccuracy: false, maximumAge: 60000 }
      );
    });
  }, []);

  const fetchFeed = useCallback(
    async (isRefresh = false, pageNum = 1) => {
      if (isFetching.current) return;
      isFetching.current = true;
      setLoading(true);
      setError(null);

      let currentCoords = coords;

      // Request location if not set yet and location not denied
      if (!currentCoords && !locationDenied) {
        currentCoords = await requestLocation();
      }

      // If location is denied, fallback to fetching global feed without lat/lng
      if (locationDenied && !currentCoords) {
        // Proceed with fetch without lat/lng
      }

      // Check client-side cache for initial refresh if location available
      if (isRefresh && pageNum === 1) {
        try {
          const cached = sessionStorage.getItem(FEED_CACHE_KEY);
          if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
              setPosts(data);
              setLoading(false);
              isFetching.current = false;
              // Fetch fresh in background
            }
          }
        } catch {
          // Ignore cache parse error
        }
      }

      const activeUserId = userId || "guest";
      const latQuery = currentCoords ? `&lat=${currentCoords.lat}` : "";
      const lngQuery = currentCoords ? `&lng=${currentCoords.lng}` : "";

      try {
        const response = await fetch(
          `/api/feed/${activeUserId}?limit=${initialLimit}&page=${pageNum}${latQuery}${lngQuery}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          throw new Error(`Feed request failed with status ${response.status}`);
        }

        const data = await response.json();
        const fetchedPosts = data.posts || [];

        if (isRefresh || pageNum === 1) {
          setPosts(fetchedPosts);
          setPage(1);
          try {
            sessionStorage.setItem(
              FEED_CACHE_KEY,
              JSON.stringify({ timestamp: Date.now(), data: fetchedPosts })
            );
          } catch {
            // Ignore quota error
          }
        } else {
          setPosts((prev) => [...prev, ...fetchedPosts]);
          setPage(pageNum);
        }

        setHasMore(data.hasMore ?? false);
      } catch (err) {
        console.error("Feed API fetch error:", err);
        setError(err.message || "Failed to load recommendation feed");
      } finally {
        setLoading(false);
        isFetching.current = false;
      }
    },
    [userId, initialLimit, coords, locationDenied, requestLocation]
  );

  useEffect(() => {
    fetchFeed(true, 1);
  }, [userId]);

  const loadMore = () => {
    if (!loading && hasMore) {
      fetchFeed(false, page + 1);
    }
  };

  const retryLocation = async () => {
    setLocationDenied(false);
    const newCoords = await requestLocation();
    if (newCoords) {
      fetchFeed(true, 1);
    }
  };

  return {
    posts,
    loading,
    error,
    hasMore,
    locationDenied,
    coords,
    fetchFeed: (isRefresh) => fetchFeed(isRefresh, 1),
    loadMore,
    retryLocation,
  };
}

export const useRecommendations = useFeed;
