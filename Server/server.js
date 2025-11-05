import express from 'express';
import pkg from 'pg';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pkg;
const app = express();

// middleware
app.use(cors());
app.use(bodyParser.json());

// database connection
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'user_webmap',
  password: process.env.PGPASSWORD || 'your_password',
  database: process.env.PGDATABASE || 'your_db'
});

// test connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL'))
  .catch(err => console.error('Database connection failed', err.stack));

// POST endpoint to store coordinates
app.post('/api/coordinates', async (req, res) => {
  const { lat, lon } = req.body;
  if (lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'Missing lat or lon' });
  }

  try {
    const query = `
      INSERT INTO user_positions (geom, created_at)
      VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), NOW())
      RETURNING id;
    `;
    const result = await pool.query(query, [lon, lat]);
    res.status(201).json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
