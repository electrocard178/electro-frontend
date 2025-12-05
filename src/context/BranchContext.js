import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchData } from '../api.js';

const BranchContext = createContext();

export const useBranch = () => {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch debe usarse dentro de BranchProvider');
  }
  return context;
};

export const BranchProvider = ({ children, isAdmin }) => {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchBranches = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await fetchData('branches');
      setBranches(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [isAdmin]);

  const setSelectedBranchHandler = (branchId) => {
    setSelectedBranch(branchId || null);
  };

  return (
    <BranchContext.Provider value={{ branches, selectedBranch, setSelectedBranch: setSelectedBranchHandler, loading, fetchBranches }}>
      {children}
    </BranchContext.Provider>
  );
};