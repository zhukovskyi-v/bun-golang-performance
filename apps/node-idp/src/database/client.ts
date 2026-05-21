import {drizzle} from 'drizzle-orm/node-postgres';

import {config} from '../config';
import * as schema from './schema';

export const db = drizzle(config.databaseUrl, {schema});
export type Db = typeof db;
