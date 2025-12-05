/**
 * Cache Service
 * Servicio de caché en memoria con TTL (Time To Live)
 * para mejorar el rendimiento del sistema
 */

class CacheService {
    constructor() {
        this.cache = new Map();
        this.timestamps = new Map();
        this.defaultTTL = 60000; // 60 segundos por defecto
    }

    /**
     * Obtener dato del caché
     * @param {string} key - Clave del caché
     * @returns {any|null} - Dato cacheado o null si no existe o expiró
     */
    get(key) {
        if (!this.isValid(key)) {
            this.invalidate(key);
            return null;
        }

        const data = this.cache.get(key);
        console.log(`📦 Cache HIT: ${key}`, data ? `(${Array.isArray(data) ? data.length : 'object'} items)` : '');
        return data;
    }

    /**
     * Guardar dato en caché
     * @param {string} key - Clave del caché
     * @param {any} data - Dato a cachear
     * @param {number} ttl - Time to live en milisegundos (opcional)
     */
    set(key, data, ttl = this.defaultTTL) {
        this.cache.set(key, data);
        this.timestamps.set(key, {
            createdAt: Date.now(),
            ttl: ttl
        });
        console.log(`💾 Cache SET: ${key}`, `(TTL: ${ttl}ms, ${Array.isArray(data) ? data.length : 'object'} items)`);
    }

    /**
     * Verificar si el caché es válido (no expiró)
     * @param {string} key - Clave del caché
     * @returns {boolean} - true si es válido, false si expiró
     */
    isValid(key) {
        if (!this.cache.has(key)) {
            return false;
        }

        const timestamp = this.timestamps.get(key);
        if (!timestamp) {
            return false;
        }

        const now = Date.now();
        const age = now - timestamp.createdAt;
        const isValid = age < timestamp.ttl;

        if (!isValid) {
            console.log(`⏰ Cache EXPIRED: ${key} (age: ${Math.round(age / 1000)}s)`);
        }

        return isValid;
    }

    /**
     * Invalidar caché específico
     * @param {string} key - Clave del caché a invalidar
     */
    invalidate(key) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.timestamps.delete(key);
            console.log(`🗑️ Cache INVALIDATED: ${key}`);
        }
    }

    /**
     * Invalidar múltiples cachés
     * @param {string[]} keys - Array de claves a invalidar
     */
    invalidateMultiple(keys) {
        keys.forEach(key => this.invalidate(key));
    }

    /**
     * Limpiar todo el caché
     */
    invalidateAll() {
        const count = this.cache.size;
        this.cache.clear();
        this.timestamps.clear();
        console.log(`🧹 Cache CLEARED: ${count} items removed`);
    }

    /**
     * Obtener estadísticas del caché
     * @returns {object} - Estadísticas del caché
     */
    getStats() {
        const stats = {
            totalItems: this.cache.size,
            items: []
        };

        this.cache.forEach((value, key) => {
            const timestamp = this.timestamps.get(key);
            const age = timestamp ? Date.now() - timestamp.createdAt : 0;
            const isValid = this.isValid(key);

            stats.items.push({
                key,
                size: Array.isArray(value) ? value.length : 1,
                age: Math.round(age / 1000),
                ttl: timestamp ? Math.round(timestamp.ttl / 1000) : 0,
                valid: isValid
            });
        });

        return stats;
    }
}

// Exportar instancia única (singleton)
const cacheService = new CacheService();
export default cacheService;
