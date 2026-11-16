const { getWorkspaceSnapshot } = require('../services/dashboardService');

exports.getReportsSummary = async (req, res, next) => {
  try {
    const workspace = await getWorkspaceSnapshot(req.user.businessId);
    res.json({
      success: true,
      summary: workspace.dashboardSummary,
      invoices: workspace.invoices,
      products: workspace.products,
      payments: workspace.payments,
      expenses: workspace.expenses,
      movements: workspace.movements
    });
  } catch (err) {
    next(err);
  }
};
