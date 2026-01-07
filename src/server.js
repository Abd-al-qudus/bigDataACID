import express from 'express';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';

dotenv.config();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

const server = express();

server.use(express.json())
server.use(cors());
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bigdata_db',
  password: process.env.DB_PASS || 'password123',
  port: 5432,
});

server.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const executeQuery = async (queryText, params = []) => {
    const client = await pool.connect();
    try {
        const start = process.hrtime();
        
        // Execute the query
        const res = await client.query(queryText, params);
        
        const stop = process.hrtime(start);
        const duration = (stop[0] * 1000 + stop[1] / 1e6).toFixed(2); // Convert to ms

        return {
            data: res.rows,
            metrics: {
                count: res.rowCount,
                executionTime: `${duration}ms`
            }
        };
    } finally {
        client.release();
    }
};

server.get('/api/employees', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 50; // Load 50 rows at a time
  const offset = (page - 1) * limit;

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM employees ORDER BY id ASC LIMIT $1 OFFSET $2', 
      [limit, offset]
    );
        
    client.release();
    res.json({
      result: result.rows,
      page: page,
      nextPage: result.rows.length === limit ? page + 1 : null
    });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
});

// UNOPTIMIZED ENDPOINT
// We force a "Sequential Scan" (Full Table Scan) by disabling index usage for this transaction
server.get('/api/search/unoptimized', async (req, res) => {
  const { q } = req.query;
  const sql = `
    BEGIN;
    SET LOCAL enable_seqscan = ON; 
    SET LOCAL enable_indexscan = OFF; 
    SET LOCAL enable_bitmapscan = OFF;
    SELECT * FROM employees WHERE firstname = $1;
    COMMIT;
  `;

  try {
    const client = await pool.connect();
    const start = process.hrtime();   

    // We run the configuration and query in the same session
    await client.query('BEGIN');
    await client.query('SET LOCAL enable_seqscan = ON');
    await client.query('SET LOCAL enable_indexscan = OFF');
    await client.query('SET LOCAL enable_bitmapscan = OFF');    
    const result = await client.query('SELECT * FROM employees WHERE firstname = $1', [q]);
    
    await client.query('COMMIT');
    client.release();

    const stop = process.hrtime(start);
    const duration = (stop[0] * 1000 + stop[1] / 1e6).toFixed(2);

    res.json({
      result: result.rows,
      metrics: {
        count: result.rowCount,
        executionTime: `${duration}ms (Server-Side)`
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// OPTIMIZED ENDPOINT
// Uses the standard Postgres planner (which will pick the Index if it exists)
server.get('/api/search/optimized', async (req, res) => {
  const { q } = req.query;
  const sql = 'SELECT * FROM employees WHERE firstname = $1';

  try {
    const result = await executeQuery(sql, [q]);
    res.json({
      result: result.data,
      metrics: {
        ...result.metrics,
        executionTime: `${result.metrics.executionTime} (Server-Side)`
        }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});