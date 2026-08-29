"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

  // Helper to generate scoped cache key based on userId and location
  const getCacheKey = useCallback(
    (location) => {
      const userPart = userId || "guest";
      const locPart = location ? `${location.lat.toFixed(2)}_${location.lng.toFixed(2)}` : "no_loc";
      return `thikana_feed_cache_${userPart}_${locPart}`;
    },
    [userId]
  );

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
          if (process.env.NODE_ENV === "development") {
            // Silently log in dev mode
          }
          setLocationDenied(true);
          setCoords(null);
          resolve(null);
        },
        { timeout: 15000, enableHighAccuracy: false, maximumAge: 300000 }
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

      if (!currentCoords && !locationDenied) {
        currentCoords = await requestLocation();
      }

      if (!currentCoords) {
        setLoading(false);
        setPosts([]);
        setLocationDenied(true);
        isFetching.current = false;
        return;
      }

      const cacheKey = getCacheKey(currentCoords);

      if (isRefresh && pageNum === 1) {
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const { timestamp, data, hasMore: cachedHasMore, page: cachedPage } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
              setPosts(data);
              setHasMore(Boolean(cachedHasMore));
              setPage(cachedPage || 1);
              setLoading(false);
              isFetching.current = false;
              return;
            }
          }
        } catch {
          // Ignore cache error
        }
      }

      const activeUserId = userId || "guest";
      const latQuery = `&lat=${currentCoords.lat}`;
      const lngQuery = `&lng=${currentCoords.lng}`;

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
              cacheKey,
              JSON.stringify({
                timestamp: Date.now(),
                data: fetchedPosts,
                hasMore: data.hasMore ?? false,
                page: 1,
              })
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
    [userId, initialLimit, coords, locationDenied, requestLocation, getCacheKey]
  );

  useEffect(() => {
    fetchFeed(true, 1);
  }, [userId, fetchFeed]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchFeed(false, page + 1);
    }
  }, [loading, hasMore, fetchFeed, page]);

  const retryLocation = useCallback(async () => {
    setLocationDenied(false);
    const newCoords = await requestLocation();
    if (newCoords) {
      fetchFeed(true, 1);
    }
  }, [requestLocation, fetchFeed]);

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
