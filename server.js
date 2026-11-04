require('dotenv').config({ quiet: true });
const path = require('path');
const express = require('express');
const db = require('./db');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT current_database() AS banco, now() AS agora');
    res.json({ ok: true, ...rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, erro: 'Sem conexão com o banco: ' + e.message });
  }
});

app.use('/api/pacientes', require('./routes/pacientes'));

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada.' }));

app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ erro: 'JSON inválido.' });
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => console.log(`SGCP rodando em http://localhost:${PORTA}`));
