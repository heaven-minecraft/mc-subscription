require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { Rcon } = require('rcon-client');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const db = new sqlite3.Database('./minecraft.db');
db.run(`CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT,
  minecraft_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Token 无效' });
  req.user = user;
  next();
}

app.post('/api/user/profile', auth, (req, res) => {
  const { minecraftId } = req.body;
  db.run(`INSERT INTO users (id, email, minecraft_id) VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET minecraft_id=excluded.minecraft_id`,
    [req.user.id, req.user.email, minecraftId], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
});

app.post('/api/webhook/stripe', async (req, res) => {
  if (req.headers['x-home-secret'] !== process.env.HOME_SERVER_SECRET) {
    return res.status(403).json({ error: '拒绝访问' });
  }
  const { email, userId, status } = req.body;
  db.run(`UPDATE users SET subscription_status = ? WHERE id = ?`, [status, userId]);
  
  db.get(`SELECT minecraft_id FROM users WHERE id = ?`, [userId], async (err, row) => {
    if (row && row.minecraft_id) {
      try {
        const rcon = await Rcon.connect({
          host: process.env.RCON_HOST, port: parseInt(process.env.RCON_PORT), password: process.env.RCON_PASSWORD
        });
        await rcon.send(`whitelist add ${row.minecraft_id}`);
        await rcon.end();
        console.log(`[RCON] 已为 ${row.minecraft_id} 添加白名单`);
      } catch (e) {
        console.error('[RCON] 失败:', e);
      }
    }
  });
  res.json({ received: true });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`🚀 家庭服务器 API 已启动，监听端口 ${process.env.PORT || 3000}`);
});