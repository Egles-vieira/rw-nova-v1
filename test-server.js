// test-server.js
require('dotenv').config();
const express = require('express');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    env_vars: {
      DB_HOST: process.env.DB_HOST || 'não configurado',
      JWT_SECRET: process.env.JWT_SECRET ? 'configurado' : 'não configurado'
    }
  });
});

app.listen(PORT, () => {
  console.log(`Servidor teste rodando na porta ${PORT}`);
});