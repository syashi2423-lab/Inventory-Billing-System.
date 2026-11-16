/**
 * MUNNEM REST API Client Layer
 * Communicates with the Node.js + Express + MySQL backend using HTTP-only JWT cookies.
 */
window.MunnemAPI = {
  baseUrl: '/api',

  async request(path, options = {}) {
    const config = {
      method: options.method || 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    if (options.body !== undefined) {
      config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(this.baseUrl + path, config);
    let data = null;
    try {
      data = await response.json();
    } catch (e) {
      data = { success: false, message: 'Unexpected server response.' };
    }

    if (!response.ok || (data && data.success === false)) {
      const error = new Error((data && data.message) || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }

    return data;
  },

  // Authentication
  register(payload) {
    return this.request('/auth/register', { method: 'POST', body: payload });
  },
  login(payload) {
    return this.request('/auth/login', { method: 'POST', body: payload });
  },
  logout() {
    return this.request('/auth/logout', { method: 'POST' });
  },
  me() {
    return this.request('/auth/me');
  },

  // Business Workspace & Settings
  getWorkspace() {
    return this.request('/business/workspace');
  },
  updateSettings(payload) {
    return this.request('/business/settings', { method: 'PUT', body: payload });
  },
  updateTemplate(payload) {
    return this.request('/business/template', { method: 'PUT', body: payload });
  },
  addTax(payload) {
    return this.request('/business/taxes', { method: 'POST', body: payload });
  },
  deleteTax(id) {
    return this.request(`/business/taxes/${id}`, { method: 'DELETE' });
  },

  // Staff Users (Owner only)
  createUser(payload) {
    return this.request('/users', { method: 'POST', body: payload });
  },
  updateUserRole(id, role) {
    return this.request(`/users/${id}/role`, { method: 'PATCH', body: { role } });
  },
  toggleUserStatus(id) {
    return this.request(`/users/${id}/status`, { method: 'PATCH' });
  },
  resetUserPassword(id, password) {
    return this.request(`/users/${id}/password`, { method: 'PATCH', body: { password } });
  },

  // Products
  createProduct(payload) {
    return this.request('/products', { method: 'POST', body: payload });
  },
  updateProduct(id, payload) {
    return this.request(`/products/${id}`, { method: 'PUT', body: payload });
  },
  deleteProduct(id) {
    return this.request(`/products/${id}`, { method: 'DELETE' });
  },

  // Inventory & Reorder List
  adjustStock(payload) {
    return this.request('/inventory/adjust', { method: 'POST', body: payload });
  },
  addToPurchaseList(productId) {
    return this.request('/inventory/purchase-list', { method: 'POST', body: { productId } });
  },
  removeFromPurchaseList(sku) {
    return this.request(`/inventory/purchase-list/${encodeURIComponent(sku)}`, { method: 'DELETE' });
  },

  // Customers
  createCustomer(payload) {
    return this.request('/customers', { method: 'POST', body: payload });
  },
  updateCustomer(id, payload) {
    return this.request(`/customers/${id}`, { method: 'PUT', body: payload });
  },
  deleteCustomer(id) {
    return this.request(`/customers/${id}`, { method: 'DELETE' });
  },

  // Invoices & Payments
  createInvoice(payload) {
    return this.request('/invoices', { method: 'POST', body: payload });
  },
  recordPayment(payload) {
    return this.request('/payments', { method: 'POST', body: payload });
  },

  // Suppliers & Purchase Orders
  createSupplier(payload) {
    return this.request('/suppliers', { method: 'POST', body: payload });
  },
  updateSupplier(id, payload) {
    return this.request(`/suppliers/${id}`, { method: 'PUT', body: payload });
  },
  deleteSupplier(id) {
    return this.request(`/suppliers/${id}`, { method: 'DELETE' });
  },
  createPurchaseOrder(payload) {
    return this.request('/purchase-orders', { method: 'POST', body: payload });
  },
  updatePurchaseOrderStatus(id, action) {
    return this.request(`/purchase-orders/${id}/status`, { method: 'PATCH', body: { action } });
  },
  payPurchaseOrder(id, payload) {
    return this.request(`/purchase-orders/${id}/pay`, { method: 'POST', body: payload });
  },

  // Expenses, Banking & Services
  createExpense(payload) {
    return this.request('/expenses', { method: 'POST', body: payload });
  },
  deleteExpense(id) {
    return this.request(`/expenses/${id}`, { method: 'DELETE' });
  },
  createBankAccount(payload) {
    return this.request('/finance/accounts', { method: 'POST', body: payload });
  },
  deleteBankAccount(id) {
    return this.request(`/finance/accounts/${id}`, { method: 'DELETE' });
  },
  createBankTransaction(payload) {
    return this.request('/finance/transactions', { method: 'POST', body: payload });
  },
  createService(payload) {
    return this.request('/services', { method: 'POST', body: payload });
  },
  updateService(id, payload) {
    return this.request(`/services/${id}`, { method: 'PUT', body: payload });
  },
  deleteService(id) {
    return this.request(`/services/${id}`, { method: 'DELETE' });
  }
};
