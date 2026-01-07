import express from 'express';
import dotenv from 'dotenv';
import pg from 'pg';
import cors from 'cors';
import path from 'path';

dotenv.config();
const { Pool } = pg;

const PORT = process.env.PORT || 3500;
const server = express();

server.use(express.json());
server.use(cors());

// Fix for ES Module path resolution
const __dirname = path.resolve();
server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Database Config
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'db',
    database: process.env.DB_NAME || 'bigdata_db',
    password: process.env.DB_PASS || 'password123',
    port: 5432,
});

// Helper: Track Execution Time
const executeQuery = async (queryText, params = []) => {
    const client = await pool.connect();
    try {
        const start = process.hrtime();
        const res = await client.query(queryText, params);
        const stop = process.hrtime(start);
        const duration = (stop[0] * 1000 + stop[1] / 1e6).toFixed(2);

        return {
            result: res.rows,
            metrics: { count: res.rowCount, executionTime: `${duration}ms` }
        };
    } finally {
        client.release();
    }
};

// 1. GET EMPLOYEES (Pagination)
server.get('/api/employees', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;

    try {
        const sql = 'SELECT * FROM employees ORDER BY id DESC LIMIT $1 OFFSET $2';
        const result = await executeQuery(sql, [limit, offset]);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// 2. ADD EMPLOYEE
server.post('/api/employees', async (req, res) => {
    const { id, firstname, lastname, dob, hostel_room, ssn, department, designation, salary, years_of_service } = req.body;
    const sql = `
        INSERT INTO employees (id, firstname, lastname, dob, hostel_room, ssn, department, designation, salary, years_of_service)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    try {
        await pool.query(sql, [id, firstname, lastname, dob, hostel_room, ssn, department, designation, salary, years_of_service]);
        res.status(201).json({ message: 'Employee created' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add employee' });
    }
});

// 3. 🔴 UNOPTIMIZED SEARCH (Force Seq Scan + Wildcard %term%)
server.get('/api/search/unoptimized', async (req, res) => {
    const { q } = req.query;
    const term = `%${q}%`; // Contains match (Slow)

    const sql = `
        BEGIN;
        SET LOCAL enable_seqscan = ON; 
        SET LOCAL enable_indexscan = OFF; 
        SET LOCAL enable_bitmapscan = OFF;
        
        SELECT * FROM employees 
        WHERE firstname ILIKE $1 OR lastname ILIKE $1 OR department ILIKE $1 OR ssn ILIKE $1;
        
        COMMIT;
    `;

    try {
        const client = await pool.connect();
        const start = process.hrtime();
        
        // Execute the transaction block
        // Note: pg library might execute these individually, so we combine them into one string
        // but for safety in Node, we'll run the setup commands then the query.
        await client.query('BEGIN');
        await client.query('SET LOCAL enable_seqscan = ON');
        await client.query('SET LOCAL enable_indexscan = OFF');
        
        const querySQL = `
            SELECT * FROM employees 
            WHERE firstname ILIKE $1 OR lastname ILIKE $1 OR department ILIKE $1 OR hostel_room ILIKE $1 OR designation ILIKE $1 OR salary::text ILIKE $1 OR ssn ILIKE $1
        `;
        const result = await client.query(querySQL, [term]);
        
        await client.query('COMMIT');
        client.release();

        const stop = process.hrtime(start);
        const duration = (stop[0] * 1000 + stop[1] / 1e6).toFixed(2);

        res.json({
            result: result.rows,
            metrics: { count: result.rowCount, executionTime: `${duration}ms (Server)` }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

// 🟢 OPTIMIZED SEARCH (Corrected for Speed)
server.get('/api/search/optimized', async (req, res) => {
    const { q } = req.query;
    
    // 1. Convert input to lowercase + prefix match
    const term = `${q.toLowerCase()}%`; 

    // 2. Query against the LOWER() columns
    // Postgres sees "WHERE LOWER(col)" and matches it to the "idx_lower_col" index!
    const sql = `
        SELECT * FROM employees 
        WHERE 
            LOWER(firstname) LIKE $1 OR 
            LOWER(lastname) LIKE $1 OR 
            LOWER(department) LIKE $1 OR
            LOWER(hostel_room) LIKE $1 OR
            salary::text LIKE $1 OR
            LOWER(designation) LIKE $1 OR
            LOWER(ssn) LIKE $1
    `;

    try {
        const result = await executeQuery(sql, [term]);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});