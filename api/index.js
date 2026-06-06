'use strict';
const express = require('express');
const { Pool } = require('pg');
const multer  = require('multer');
const crypto  = require('crypto');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const upload = multer({ dest: '/app/uploads/' });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('/app/uploads'));

/* auto-create tables table */
pool.query(`
  CREATE TABLE IF NOT EXISTS tables (
    id         BIGSERIAL    PRIMARY KEY,
    name       TEXT         NOT NULL,
    token      TEXT         NOT NULL UNIQUE,
    active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  )
`).then(() => console.log('tables table ready')).catch(e => console.error('migrate tables:', e.message));

/* ---- helpers ---- */
function row2dish(r) {
  return {
    id: r.id, name: r.name, category: r.category,
    price: r.price, price_num: r.price_num,
    emoji: r.emoji, description: r.description,
    ingr: r.ingr, weight: r.weight,
    active: r.active, visible: r.visible,
    img_url: r.img_url, sort_order: r.sort_order
  };
}
const fail = (res, e) => res.status(500).json({ error: e.message });

/* ---- dishes ---- */
app.get('/api/dishes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM dishes ORDER BY sort_order, id');
    res.json(rows.map(row2dish));
  } catch(e) { fail(res, e); }
});

app.post('/api/dishes', async (req, res) => {
  const d = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO dishes
         (name,category,price,price_num,emoji,description,ingr,weight,active,visible,img_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [d.name,d.category,d.price,d.price_num||0,d.emoji||'🍽',
       d.description||'',d.ingr||'',d.weight||'',
       d.active!==false,d.visible!==false,d.img_url||'']);
    res.json(row2dish(rows[0]));
  } catch(e) { fail(res, e); }
});

app.put('/api/dishes/reorder', async (req, res) => {
  const items = req.body;
  try {
    for (const item of items)
      await pool.query('UPDATE dishes SET sort_order=$1 WHERE id=$2', [item.sort_order, item.id]);
    res.json({ ok: true });
  } catch(e) { fail(res, e); }
});

app.put('/api/dishes/:id', async (req, res) => {
  const d = req.body; const id = req.params.id;
  try {
    const current = await pool.query('SELECT * FROM dishes WHERE id=$1',[id]);
    if (!current.rows.length) return res.status(404).send('Not found');
    const c = current.rows[0];
    const { rows } = await pool.query(
      `UPDATE dishes SET
         name=$1,category=$2,price=$3,price_num=$4,emoji=$5,
         description=$6,ingr=$7,weight=$8,active=$9,visible=$10,img_url=$11
       WHERE id=$12 RETURNING *`,
      [d.name??c.name, d.category??c.category, d.price??c.price,
       d.price_num??c.price_num, d.emoji??c.emoji,
       d.description??c.description, d.ingr??c.ingr, d.weight??c.weight,
       d.active??c.active, d.visible??c.visible, d.img_url??c.img_url, id]);
    res.json(row2dish(rows[0]));
  } catch(e) { fail(res, e); }
});

app.delete('/api/dishes/all', async (req, res) => {
  try { await pool.query('DELETE FROM dishes'); res.json({ ok: true }); }
  catch(e) { fail(res, e); }
});

app.delete('/api/dishes/:id', async (req, res) => {
  try { await pool.query('DELETE FROM dishes WHERE id=$1',[req.params.id]); res.json({ ok: true }); }
  catch(e) { fail(res, e); }
});

/* ---- tables ---- */
app.get('/api/tables', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tables ORDER BY id');
    res.json(rows);
  } catch(e) { fail(res, e); }
});

app.post('/api/tables', async (req, res) => {
  const { name } = req.body;
  const token = crypto.randomBytes(4).toString('hex');
  try {
    const { rows } = await pool.query(
      'INSERT INTO tables (name, token) VALUES ($1, $2) RETURNING *', [name, token]);
    res.json(rows[0]);
  } catch(e) { fail(res, e); }
});

app.get('/api/tables/by-token/:token', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM tables WHERE token=$1 AND active=TRUE', [req.params.token]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch(e) { fail(res, e); }
});

app.put('/api/tables/:id', async (req, res) => {
  const { name, active } = req.body; const id = req.params.id;
  try {
    const sets = []; const vals = []; let i = 1;
    if (name !== undefined) { sets.push(`name=$${i++}`); vals.push(name); }
    if (active !== undefined) { sets.push(`active=$${i++}`); vals.push(active); }
    if (!sets.length) return res.json({ ok: true });
    vals.push(id);
    await pool.query(`UPDATE tables SET ${sets.join(',')} WHERE id=$${i}`, vals);
    res.json({ ok: true });
  } catch(e) { fail(res, e); }
});

app.delete('/api/tables/:id', async (req, res) => {
  try { await pool.query('DELETE FROM tables WHERE id=$1',[req.params.id]); res.json({ ok: true }); }
  catch(e) { fail(res, e); }
});

/* ---- upload ---- */
app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('No file');
  const ext  = path.extname(req.file.originalname) || '.jpg';
  const dest = req.file.path + ext;
  fs.renameSync(req.file.path, dest);
  res.json({ url: '/uploads/' + path.basename(dest) });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.listen(3000, () => console.log('Fazo API :3000'));
