import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { config } from '../config';
import * as schema from './schema';

export const sql = new SQL({ url: config.databaseUrl, max: 10 });
export const db = drizzle({ client: sql, schema });
export type Db = typeof db;
