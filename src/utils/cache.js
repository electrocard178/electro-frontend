// Simple in-memory cache utility for static data
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.expirationTimes = new Map();
  }

  set(key, value, ttl = 300000) { // Default 5 minutes TTL
    this.cache.set(key, value);
    this.expirationTimes.set(key, Date.now() + ttl);
  }

  get(key) {
    if (this.expirationTimes.get(key) < Date.now()) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  has(key) {
    if (this.expirationTimes.get(key) < Date.now()) {
      this.delete(key);
      return false;
    }
    return this.cache.has(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.expirationTimes.delete(key);
  }

  clear() {
    this.cache.clear();
    this.expirationTimes.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Create a singleton instance
const cache = new MemoryCache();

export default cache;