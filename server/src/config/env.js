import dotenv from 'dotenv';

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const PORT = Number(process.env.PORT) || 5000;

if (NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  console.error('FATAL: MONGODB_URI is required in production mode');
  process.exit(1);
}

export const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shareplate';

const rawOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const CLIENT_ORIGIN = rawOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
