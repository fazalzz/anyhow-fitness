const { Pool } = require('pg');

let connector;
let pool;
let poolReady;

const DEFAULT_POOL_MAX = parseInt(process.env.DB_POOL_MAX ?? '10', 10);
const DEFAULT_IDLE_TIMEOUT = parseInt(process.env.DB_IDLE_TIMEOUT ?? '30000', 10);
const DEFAULT_CONN_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT ?? '10000', 10);

const createPoolViaDatabaseUrl = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  const sslRequired = /sslmode=(require|verify-full)/i.test(connectionString) || process.env.DB_SSL === 'true';

  return new Pool({
    connectionString,
    max: DEFAULT_POOL_MAX,
    idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT,
    connectionTimeoutMillis: DEFAULT_CONN_TIMEOUT,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
  });
};

const createPoolViaCredentials = () => {
  if (!process.env.DB_HOST) {
    return null;
  }

  const sslEnabled = process.env.DB_SSL === 'true';

  return new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: DEFAULT_POOL_MAX,
    idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT,
    connectionTimeoutMillis: DEFAULT_CONN_TIMEOUT,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  });
};

const createPoolViaCloudSqlConnector = async () => {
  const { Connector } = require('@google-cloud/cloud-sql-connector');
  connector = new Connector();

  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.INSTANCE_CONNECTION_NAME || 'anyhow-fitness-app:us-central1:anyhow-fitness-db',
    ipType: process.env.DB_IP_TYPE || 'PUBLIC',
  });

  return new Pool({
    ...clientOpts,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    max: DEFAULT_POOL_MAX,
    idleTimeoutMillis: DEFAULT_IDLE_TIMEOUT,
    connectionTimeoutMillis: DEFAULT_CONN_TIMEOUT,
  });
};

const initialisePool = async () => {
  if (pool) {
    return pool;
  }

  pool = createPoolViaDatabaseUrl() || createPoolViaCredentials();

  if (!pool) {
    pool = await createPoolViaCloudSqlConnector();
  }

  pool.on('error', (err) => {
    console.error('Database pool error:', err);
  });

  return pool;
};

poolReady = initialisePool().catch((err) => {
  console.error('Failed to initialise database pool:', err);
  throw err;
});

const getPool = async () => {
  if (pool) {
    return pool;
  }
  return poolReady;
};

const query = async (text, params = []) => {
  const activePool = await getPool();
  const client = await activePool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
};

const closePool = async () => {
  if (pool) {
    try {
      await pool.end();
    } catch (err) {
      console.error('Error closing database pool:', err);
    } finally {
      pool = undefined;
    }
  }

  if (connector) {
    try {
      connector.close();
    } catch (err) {
      console.error('Error closing Cloud SQL connector:', err);
    } finally {
      connector = undefined;
    }
  }
};

process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);
process.on('exit', closePool);

module.exports = { query };
