import { DatabaseError, Pool, PoolClient, QueryResult } from 'pg';

export class Database {
    private static instance: Database;
    private pool: Pool;


    private constructor() {
        this.pool = new Pool({
            host: process.env.DATABASE_HOST || 'localhost',
            port: Number(process.env.DATABASE_PORT) || 5432,
            database: process.env.DATABASE_NAME || 'flux_wallet',
            user: process.env.DATABASE_USER || 'flux_user',
            password: process.env.DATABASE_PASSWORD || 'flux_password',
            max: 20, // Maximum number of connections
            idleTimeoutMillis: 30000, // 30 seconds
            connectionTimeoutMillis: 5000, // 5 seconds   
        });

        this.pool.on('error', (err: DatabaseError, client: PoolClient) => {
            console.error('Unexpected error on idle database client', err, client);
        });
    }

    /**
     *  Get the singleton instance of the Database.
     * @returns Database
     */
    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }


    /**
     * Get a database client from the pool.
     * @returns PoolClient
     */
    public async getClient(): Promise<PoolClient> {
        return await this.pool.connect();
    }


    /**
     * Execute a single query against the database. With automatic error handling and logging.
     * 
     * @param text 
     * @param params 
     * @returns Query Result
     */

    public async query(text: string, params?: any[]): Promise<QueryResult> {
        const start = Date.now();
        try {
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            // console.log('Executed query', {
            //     text: text.substring(0, 100) + '...', // Log first 100 chars
            //     duration,
            //     rows: result.rowCount
            // });
            return result;

        } catch (error) {
            console.error('Database query error:', { text, error });
            throw error;
        }
    }

    /**
     * Close the database pool.
     */
    public async close(): Promise<void> {
        await this.pool.end();
    }


    /**
     * Executes a function within a database transaction.
     * Automatically commits on success, rolls back on error.
     * 
     * @param callback Function to execute within transaction
     * @returns Result of callback
     */
    public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> { 
        const client = await this.getClient();

        try {
            await client.query('BEGIN');
            console.log("Transaction started");

            const result = await callback(client);

            await client.query('COMMIT');
            console.log("Transaction committed");

            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error("Transaction rolled back due to error:", error);
            throw error;

        } finally {
            client.release();
        }
    }
}