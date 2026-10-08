import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseOptions } from './config/database.config';

export default new DataSource(databaseOptions());
