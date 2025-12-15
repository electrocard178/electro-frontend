import React, { useState, useEffect, Suspense } from 'react'; // Force Rebuild
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useDataContext } from './context/DataContext';
import LayoutHeader from './components/LayoutHeader';
import Sidebar from './components/Sidebar';

// Lazy load components
const DashboardHome = React.lazy(() => import('./components/DashboardHome'));
const PersonList = React.lazy(() => import('./components/PersonList'));
const PersonForm = React.lazy(() => import('./components/PersonForm'));
const ProductList = React.lazy(() => import('./components/ProductList'));
const ProductForm = React.lazy(() => import('./components/ProductForm'));
const SalesModule = React.lazy(() => import('./components/SalesModule'));
const PurchasesModule = React.lazy(() => import('./components/PurchasesModule'));
const ReportsModule = React.lazy(() => import('./components/ReportsModule'));
const ProfitModule = React.lazy(() => import('./components/ProfitModule'));
const LoginScreen = React.lazy(() => import('./components/LoginScreen'));
const DefectiveProductsModule = React.lazy(() => import('./components/DefectiveProductsModule'));
const UserList = React.lazy(() => import('./components/UserList'));
const UserForm = React.lazy(() => import('./components/UserForm'));
const BranchList = React.lazy(() => import('./components/BranchList'));
const BranchForm = React.lazy(() => import('./components/BranchForm'));
const TestConnection = React.lazy(() => import('./components/TestConnection'));
const ServiceList = React.lazy(() => import('./components/ServiceList'));

import {
  userService,
  productService,
  personService,
  saleService,
  purchaseService,
  branchService,
  defectiveProductService,
  serviceService,
  productCategoryService
} from './services/apiService';

const AppContent = () => {
  const { isLoggedIn, currentUser, token, login, logout } = useAuth();
  const { refresh, refreshAll } = useDataContext();
  const [currentPage, setCurrentPage] = useState('login');
  const [branches, setBranches] = useState([]);
  const [editingBranch, setEditingBranch] = useState(null);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Estados para datos
  const [persons, setPersons] = useState([]);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [defectiveProducts, setDefectiveProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [editingPerson, setEditingPerson] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [salesModuleState, setSalesModuleState] = useState({
    selectedPerson: '',
    selectedProduct: '',
    quantity: 1,
    priceOverride: '',
    paymentMethod: 'efectivo',
    saleDetails: [],
    amountReceived: '',
  });
  const [purchasesModuleState, setPurchasesModuleState] = useState({
    selectedPerson: '',
    selectedProduct: '',
    quantity: 1,
    priceOverride: '',
    purchaseDetails: [],
  });


  const loadDataFromAPI = async (branchIdOverride = null, tokenParam) => {
    let effectiveToken = tokenParam || token;
    if (!effectiveToken) return;

    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      let currentBranchId = null;
      if (currentUser?.role === 'admin') {
        currentBranchId = branchIdOverride !== undefined ? branchIdOverride : selectedBranch;
      } else if (currentUser?.role === 'cashier') {
        currentBranchId = branchIdOverride || currentUser.branchId;
      }

      const branchParams = currentBranchId ? { branchId: currentBranchId } : {};

      const [
        personsData,
        productsData,
        salesData,
        purchasesData,
        defectiveProductsData,
        usersData,
        branchesData,
        servicesData
      ] = await Promise.all([
        personService.getAll(effectiveToken, currentUser, branchParams).catch(() => []),
        productService.getAll(effectiveToken, currentUser, branchParams).catch(() => []),
        saleService.getAll(effectiveToken, currentUser, branchParams).catch(() => []),
        purchaseService.getAll(effectiveToken, currentUser, branchParams).catch(() => []),
        defectiveProductService.getAll(effectiveToken, currentUser, branchParams).catch(() => []),
        userService.getAll(effectiveToken, currentUser).catch(() => []),
        branchService.getAll(effectiveToken, currentUser).catch(() => []),
        serviceService.getAll(effectiveToken, currentUser).catch(() => [])
      ]);

      setPersons(Array.isArray(personsData) ? personsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setSales(Array.isArray(salesData) ? salesData : []);
      setPurchases(Array.isArray(purchasesData) ? purchasesData : []);
      setDefectiveProducts(Array.isArray(defectiveProductsData) ? defectiveProductsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setBranches(Array.isArray(branchesData) ? branchesData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn && currentUser && token) {
      loadDataFromAPI();
    }
  }, [isLoggedIn, currentUser, token]);

  const checkAccess = (page) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const allowedPages = ['dashboard', 'persons', 'products', 'sales', 'reports', 'defective', 'services'];
    return allowedPages.includes(page);
  };

  useEffect(() => {
    if (isLoggedIn && currentUser && !checkAccess(currentPage)) {
      setCurrentPage('dashboard');
    }
  }, [isLoggedIn, currentUser, currentPage]);

  const handleLogin = async (loginData) => {
    try {
      const { token, user } = loginData;
      login(token, user);
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  };

  const handleLogout = () => {
    logout();
    setPersons([]);
    setProducts([]);
    setSales([]);
    setCurrentPage('login');
  };

  const handleNavigate = (page) => {
    if (checkAccess(page)) {
      setCurrentPage(page);
      if (['sales', 'purchases', 'products'].includes(page)) {
        loadDataFromAPI();
      }
    } else {
      alert('Sin acceso.');
    }
  };

  const handleBranchChange = (branchId) => {
    setSelectedBranch(branchId);
    loadDataFromAPI(branchId);
  };

  // Handlers
  const handleAddSale = async (newSale, branchId, saleDetails) => {
    try {
      const saleData = { ...newSale, branchId, details: saleDetails };
      const response = await saleService.create(token, currentUser, saleData);
      setSales([...sales, response.sale]);
      loadDataFromAPI();
      return { success: true, sale: response.sale };
    } catch (error) {
      console.error('Error adding sale:', error);
      return { success: false, error: error.message };
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (productData.id || productData._id) {
        await productService.update(token, currentUser, productData.id || productData._id, productData);
      } else {
        await productService.create(token, currentUser, productData);
      }
      await loadDataFromAPI();
      setEditingProduct(null);
      return { success: true };
    } catch (error) {
      console.error('Error saving product:', error);
      alert(error.message);
    }
  };

  const handleDeleteProduct = async (id, password) => {
    try {
      await productService.delete(token, currentUser, id, password);
      await loadDataFromAPI();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.message);
    }
  };

  const handleAddPurchase = async (purchaseData) => {
    try {
      await purchaseService.create(token, currentUser, purchaseData);
      await loadDataFromAPI();
      return { success: true };
    } catch (error) {
      console.error('Error adding purchase:', error);
      alert(error.message);
      return { success: false, error: error.message };
    }
  };

  const handleReloadDefectiveProducts = async () => {
    const data = await defectiveProductService.getAll(token, currentUser);
    setDefectiveProducts(data);
  };

  const renderPage = () => {
    const LoadingFallback = () => <div className="p-10">Cargando...</div>;

    if (!isLoggedIn) {
      return <Suspense fallback={<LoadingFallback />}><LoginScreen onLogin={handleLogin} users={users} branches={branches} /></Suspense>;
    }

    return (
      <Suspense fallback={<LoadingFallback />}>
        {(() => {
          switch (currentPage) {
            case 'dashboard':
              return <DashboardHome onNavigate={handleNavigate} currentUser={currentUser} sales={sales} purchases={purchases} users={users} />;
            case 'sales':
              return <SalesModule
                sales={sales} purchases={purchases} products={products} persons={persons} services={services}
                currentUser={currentUser} branches={branches} users={users}
                moduleState={salesModuleState} setModuleState={setSalesModuleState}
                selectedBranch={selectedBranch}
                onAddSale={handleAddSale}
              />;
            case 'purchases':
              return <PurchasesModule
                purchases={purchases} products={products} persons={persons} currentUser={currentUser}
                branches={branches} moduleState={purchasesModuleState} setModuleState={setPurchasesModuleState}
                selectedBranch={selectedBranch} onAddPurchase={handleAddPurchase}
              />;
            case 'products':
              return editingProduct ? (
                <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={() => setEditingProduct(null)} branches={branches} currentUser={currentUser} />
              ) : (
                <ProductList products={products} currentUser={currentUser} branches={branches} selectedBranch={selectedBranch} token={token}
                  onAdd={() => setEditingProduct({})} onEdit={setEditingProduct} onDelete={handleDeleteProduct} />
              );
            case 'services':
              return <ServiceList services={services} products={products} currentUser={currentUser} token={token} onRefresh={loadDataFromAPI} />;
            case 'persons':
              return editingPerson ? (
                <PersonForm person={editingPerson} onSave={async (p) => {
                  if (p._id) await personService.update(token, currentUser, p._id, p);
                  else await personService.create(token, currentUser, p);
                  loadDataFromAPI(); setEditingPerson(null);
                }} onCancel={() => setEditingPerson(null)} branches={branches} currentUser={currentUser} />
              ) : (
                <PersonList persons={persons} branches={branches} onEdit={setEditingPerson}
                  onDelete={async (id) => { await personService.delete(token, currentUser, id); loadDataFromAPI(); }}
                  onAdd={() => setEditingPerson({})} currentUser={currentUser} />
              );
            case 'reports':
              return <ReportsModule sales={sales} purchases={purchases} persons={persons} products={products} services={services} branches={branches} users={users} currentUser={currentUser} />;
            case 'profits':
              return <ProfitModule sales={sales} purchases={purchases} products={products} services={services} branches={branches} currentUser={currentUser} selectedBranch={selectedBranch} defectiveProducts={defectiveProducts} users={users} />;
            case 'users':
              return <UserList users={users} branches={branches} />; // Needs handlers if editable
            case 'branches':
              return editingBranch ? (
                <BranchForm branch={editingBranch} onSave={async (b) => {
                  if (b._id) await branchService.update(token, currentUser, b._id, b);
                  else await branchService.create(token, currentUser, b);
                  loadDataFromAPI(); setEditingBranch(null);
                }} onCancel={() => setEditingBranch(null)} users={users} />
              ) : (
                <BranchList branches={branches} onEdit={setEditingBranch} onDelete={async (id) => { await branchService.delete(token, currentUser, id); loadDataFromAPI(); }} onAdd={() => setEditingBranch({})} users={users} />
              );
            case 'defective':
              return <DefectiveProductsModule defectiveProducts={defectiveProducts} products={products} users={users} currentUser={currentUser} token={token} onRefresh={handleReloadDefectiveProducts} />;
            case 'test-connection':
              return <TestConnection />;
            default:
              return <DashboardHome onNavigate={handleNavigate} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {isLoggedIn && <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentUser={currentUser} onLogout={handleLogout} />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isLoggedIn && <LayoutHeader currentPage={currentPage} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} currentUser={currentUser} branches={branches} selectedBranch={selectedBranch} onBranchChange={handleBranchChange} />}
        <main className="flex-1 overflow-hidden p-4 relative">{renderPage()}</main>
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <DataProvider>
      <AppContent />
    </DataProvider>
  </AuthProvider>
);

export default App;
