const express  = require('express');
const router   = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const authCtrl  = require('../controllers/authController');
const leadsCtrl = require('../controllers/leadsController');
const legajoRoutes = require('../legajo/routes');

// -- Auth ---------------------------------------------------------
router.post('/auth/register', authCtrl.register);
router.post('/auth/login',    authCtrl.login);
router.get ('/auth/me',       authenticate, authCtrl.me);
router.post('/auth/logout',   authenticate, authCtrl.logout);

// -- Leads --------------------------------------------------------
router.get ('/leads/stats',      authenticate, leadsCtrl.getStats);
router.get ('/leads',            authenticate, leadsCtrl.getLeads);
router.get ('/leads/:id',        authenticate, leadsCtrl.getLeadById);
router.post('/leads',            authenticate, leadsCtrl.createLead);
router.patch('/leads/:id/stage', authenticate, leadsCtrl.moveStage);

// -- Legajo.ar ----------------------------------------------------
router.use('/legajo', legajoRoutes);

// -- Health check -------------------------------------------------
router.get('/health', (req, res) => {
  res.json({
    status:  'ok',
    product: 'SessiAn CRM',
    company: 'IT Session Consulting',
    version: '1.0.0',
    ts:      new Date().toISOString()
  });
});

module.exports = router;
