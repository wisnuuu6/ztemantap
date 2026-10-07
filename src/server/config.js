import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  dbPath: process.env.DB_PATH || './data/app.db',
  isProduction: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY
    ? process.env.TRUST_PROXY.split(',').map((address) => address.trim()).filter(Boolean)
    : ['127.0.0.1', '::1'],
  cookieMaxAgeSeconds: 60 * 60 * 12,
};
