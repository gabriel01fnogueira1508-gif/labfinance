import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { query } from './db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');
const app = express();
const PORT = Number(process.env.PORT || 3000);

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origem não permitida pelo CORS.'));
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(publicDir));

async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_store (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

app.get('/api/health', async (_req, res) => {
  try {
    const result = await query('SELECT NOW() AS now');
    res.json({ ok: true, dbTime: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/store/:key', async (req, res) => {
  try {
    const result = await query('SELECT value, updated_at FROM app_store WHERE key = $1', [req.params.key]);
    if (result.rowCount === 0) {
      return res.json({ key: req.params.key, value: null, updatedAt: null });
    }
    return res.json({ key: req.params.key, value: result.rows[0].value, updatedAt: result.rows[0].updated_at });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.put('/api/store/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (typeof value === 'undefined') {
      return res.status(400).json({ error: 'O corpo da requisição precisa ter o campo value.' });
    }

    const result = await query(
      `INSERT INTO app_store (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
       RETURNING key, value, updated_at`,
      [req.params.key, JSON.stringify(value)]
    );

    return res.json({
      key: result.rows[0].key,
      value: result.rows[0].value,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LabFinance rodando em http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Erro ao iniciar a aplicação:', error);
    process.exit(1);
  });
