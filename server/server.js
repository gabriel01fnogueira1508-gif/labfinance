const path = require('path');
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const crypto = require('crypto');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;
const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET || 'troque-esta-chave-em-producao';

if (!DATABASE_URL) {
  console.error('DATABASE_URL não definida.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new pgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  }),
  name: 'labfinance.sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12,
  }
}));

function sanitizeUser(row) {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    role: row.role,
  };
}

async function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    const result = await pool.query('SELECT id, nome, email, role FROM users WHERE id = $1', [req.session.userId]);
    if (!result.rows[0]) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Sessão inválida.' });
    }
    req.user = sanitizeUser(result.rows[0]);
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao validar sessão.' });
  }
}

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');

  if (!email || !senha) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  try {
    const result = await pool.query(
      'SELECT id, nome, email, role, password_hash FROM users WHERE email = $1 AND ativo = true LIMIT 1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const [salt, storedHash] = String(user.password_hash || '').split(':');
    if (!salt || !storedHash) {
      return res.status(500).json({ error: 'Formato de senha inválido no banco.' });
    }

    const derivedHash = await new Promise((resolve, reject) => {
      crypto.scrypt(senha, salt, 64, (err, key) => err ? reject(err) : resolve(key.toString('hex')));
    });

    const ok = crypto.timingSafeEqual(Buffer.from(derivedHash, 'hex'), Buffer.from(storedHash, 'hex'));
    if (!ok) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    req.session.userId = user.id;
    req.session.userEmail = user.email;

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno no login.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
    }
    res.clearCookie('labfinance.sid');
    res.json({ ok: true });
  });
});

app.get('/api/protected/ping', requireAuth, (_req, res) => {
  res.json({ ok: true, message: 'Você está autenticado.' });
});

app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`LabFinance auth rodando na porta ${PORT}`);
});
