const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const businessRoutes = require('./businessRoutes');
const userRoutes = require('./userRoutes');
const productRoutes = require('./productRoutes');
const inventoryRoutes = require('./inventoryRoutes');
const customerRoutes = require('./customerRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const paymentRoutes = require('./paymentRoutes');
const supplierRoutes = require('./supplierRoutes');
const purchaseOrderRoutes = require('./purchaseOrderRoutes');
const expenseRoutes = require('./expenseRoutes');
const financeRoutes = require('./financeRoutes');
const serviceRoutes = require('./serviceRoutes');
const reportRoutes = require('./reportRoutes');

router.get('/health', (req, res) => {
  res.json({ success: true, service: 'MUNNEM Retail ERP API', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/business', businessRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/customers', customerRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/expenses', expenseRoutes);
router.use('/finance', financeRoutes);
router.use('/services', serviceRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
