import geohash from "ngeohash";

/**
 * Encodes latitude and longitude into a geohash string.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [precision=5] - Geohash character length (default 5 = ~4.9km x 4.9km cell)
 * @returns {string} 5-character geocell precision hash
 */
export function encodeGeohash(lat, lng, precision = 5) {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    throw new Error("Invalid latitude or longitude provided for geohash encoding");
  }
  return geohash.encode(lat, lng, precision);
}

/**
 * Calculates a geohash bounding box and its 8 adjacent neighbor geohash cells for spatial radius queries.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [precision=5] - Geohash character length
 * @returns {{ centerHash: string, neighbors: string[], allCells: string[], bbox: [number, number, number, number] }}
 */
export function getGeohashNeighbors(lat, lng, precision = 5) {
  const centerHash = encodeGeohash(lat, lng, precision);
  // ngeohash.neighbors returns an array of 8 surrounding neighbor cells
  const neighbors = geohash.neighbors(centerHash) || [];
  // Combining center cell with its 8 surrounding neighbors gives full 3x3 grid coverage (~15km x 15km for precision 5)
  const allCells = [centerHash, ...neighbors];
  const bbox = geohash.decode_bbox(centerHash);

  return {
    centerHash,
    neighbors,
    allCells,
    bbox, // [minLat, minLng, maxLat, maxLng]
  };
}

/**
 * Decodes a geohash string back into lat/lng coordinates.
 * @param {string} hash - Geohash string
 * @returns {{ latitude: number, longitude: number }}
 */
export function decodeGeohash(hash) {
  if (!hash || typeof hash !== "string") {
    throw new Error("Invalid geohash string provided");
  }
  return geohash.decode(hash);
}
