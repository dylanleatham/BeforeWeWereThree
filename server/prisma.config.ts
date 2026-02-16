import path from 'node:path';
import dotenv from 'dotenv';
import { defineConfig } from 'prisma/config';

dotenv.config({ path: path.join(import.meta.dirname, '.env') });

export default defineConfig({
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
});
