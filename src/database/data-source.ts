import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { getDatabaseOptions } from './database.config';

config();

export default new DataSource(getDatabaseOptions());
