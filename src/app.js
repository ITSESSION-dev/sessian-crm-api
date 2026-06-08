require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const { testConnection }  = require('./config/database');
const routes              = require('./routes/index');
const { errorHandler }    = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3001;
const API  = `/api/${process.env.API_VERSION || 'v1'}`;

app.use(helmet());
app.use(cors({
  origin:      (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(','),
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

app.use(API, routes);

app.get('/', (req, res) => {
  res.json({
    product: 'SessiAn CRM API',
    company: 'IT Session Consulting',
    version: '1.0.0',
    api:     API,
    support: 'soporte@itsession.com.ar'
  });
});

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` });
});

app.use(errorHandler);

const start = async () => {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║       SessiAn CRM API — IT Session       ║
║                                          ║
║  http://localhost:${PORT}                   ║
║  ${API}              ║
╚══════════════════════════════════════════╝
    `);
  });
};

start();
module.exports = app;