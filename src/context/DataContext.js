import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import cacheService from '../services/cacheService';
import {
    userService,
    productService,
    personService,
    saleService,
    purchaseService,
    branchService,
    defectiveProductService
} from '../services/apiService';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
    const { token, currentUser, isLoggedIn } = useAuth();

    // Estados de loading y error globales
    const [loadingStates, setLoadingStates] = useState({});
    const [errors, setErrors] = useState({});

    /**
     * Función genérica para cargar datos con caché
     */
    const loadData = useCallback(async (key, fetchFunction, branchParams = {}) => {
        // Verificar caché primero
        const cached = cacheService.get(key);
        if (cached !== null) {
            return cached;
        }

        // Si no hay caché, cargar desde API
        setLoadingStates(prev => ({ ...prev, [key]: true }));
        setErrors(prev => ({ ...prev, [key]: null }));

        try {
            const data = await fetchFunction(token, currentUser, branchParams);
            const result = Array.isArray(data) ? data : [];

            // Guardar en caché
            cacheService.set(key, result);

            setLoadingStates(prev => ({ ...prev, [key]: false }));
            return result;
        } catch (error) {
            console.error(`Error loading ${key}:`, error);
            setErrors(prev => ({ ...prev, [key]: error.message }));
            setLoadingStates(prev => ({ ...prev, [key]: false }));
            return [];
        }
    }, [token, currentUser]);

    /**
     * Función para invalidar caché y recargar
     */
    const refresh = useCallback((key) => {
        cacheService.invalidate(key);
    }, []);

    /**
     * Función para invalidar todo el caché
     */
    const refreshAll = useCallback(() => {
        cacheService.invalidateAll();
    }, []);

    // Limpiar caché al hacer logout
    useEffect(() => {
        if (!isLoggedIn) {
            cacheService.invalidateAll();
        }
    }, [isLoggedIn]);

    const value = {
        loadData,
        refresh,
        refreshAll,
        loadingStates,
        errors,
        cacheService
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useDataContext must be used within DataProvider');
    }
    return context;
};

/**
 * Hook para cargar productos
 */
export const useProducts = (branchParams = {}) => {
    const { loadData, refresh, loadingStates, errors } = useDataContext();
    const [products, setProducts] = useState([]);

    useEffect(() => {
        const fetchProducts = async () => {
            const data = await loadData('products', productService.getAll, branchParams);
            setProducts(data);
        };
        fetchProducts();
    }, [loadData, JSON.stringify(branchParams)]);

    return {
        products,
        loading: loadingStates['products'] || false,
        error: errors['products'] || null,
        refresh: () => refresh('products')
    };
};

/**
 * Hook para cargar personas (clientes/proveedores)
 */
export const usePersons = (branchParams = {}) => {
    const { loadData, refresh, loadingStates, errors } = useDataContext();
    const [persons, setPersons] = useState([]);

    useEffect(() => {
        const fetchPersons = async () => {
            const data = await loadData('persons', personService.getAll, branchParams);
            setPersons(data);
        };
        fetchPersons();
    }, [loadData, JSON.stringify(branchParams)]);

    return {
        persons,
        loading: loadingStates['persons'] || false,
        error: errors['persons'] || null,
        refresh: () => refresh('persons')
    };
};

/**
 * Hook para cargar ventas
 */
export const useSales = (branchParams = {}) => {
    const { loadData, refresh, loadingStates, errors } = useDataContext();
    const [sales, setSales] = useState([]);

    useEffect(() => {
        const fetchSales = async () => {
            const data = await loadData('sales', saleService.getAll, branchParams);
            setSales(data);
        };
        fetchSales();
    }, [loadData, JSON.stringify(branchParams)]);

    return {
        sales,
        loading: loadingStates['sales'] || false,
        error: errors['sales'] || null,
        refresh: () => refresh('sales')
    };
};

/**
 * Hook para cargar compras
 */
export const usePurchases = (branchParams = {}) => {
    const { loadData, refresh, loadingStates, errors } = useDataContext();
    const [purchases, setPurchases] = useState([]);

    useEffect(() => {
        const fetchPurchases = async () => {
            const data = await loadData('purchases', purchaseService.getAll, branchParams);
            setPurchases(data);
        };
        fetchPurchases();
    }, [loadData, JSON.stringify(branchParams)]);

    return {
        purchases,
        loading: loadingStates['purchases'] || false,
        error: errors['purchases'] || null,
        refresh: () => refresh('purchases')
    };
};

/**
 * Hook para cargar sucursales
 */
export const useBranches = () => {
    const { loadData, refresh, loadingStates, errors } = useDataContext();
    const [branches, setBranches] = useState([]);

    useEffect(() => {
        const fetchBranches = async () => {
            const data = await loadData('branches', branchService.getAll);
            setBranches(data);
        };
        fetchBranches();
    }, [loadData]);

    return {
        branches,
        loading: loadingStates['branches'] || false,
        error: errors['branches'] || null,
        refresh: () => refresh('branches')
    };
};

/**
 * Hook para cargar usuarios
 */
export const useUsers = () => {
    const { loadData, refresh, loadingStates, errors } = useDataContext();
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            const data = await loadData('users', userService.getAll);
            setUsers(data);
        };
        fetchUsers();
    }, [loadData]);

    return {
        users,
        loading: loadingStates['users'] || false,
        error: errors['users'] || null,
        refresh: () => refresh('users')
    };
};

/**
 * Hook para cargar productos defectuosos
 */
export const useDefectiveProducts = (branchParams = {}) => {
    const { loadData, refresh, loadingStates, errors } = useDataContext();
    const [defectiveProducts, setDefectiveProducts] = useState([]);

    useEffect(() => {
        const fetchDefectiveProducts = async () => {
            const data = await loadData('defectiveProducts', defectiveProductService.getAll, branchParams);
            setDefectiveProducts(data);
        };
        fetchDefectiveProducts();
    }, [loadData, JSON.stringify(branchParams)]);

    return {
        defectiveProducts,
        loading: loadingStates['defectiveProducts'] || false,
        error: errors['defectiveProducts'] || null,
        refresh: () => refresh('defectiveProducts')
    };
};

export default DataContext;
