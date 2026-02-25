import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  ADMIN_PANEL_PORT: z.coerce.number().default(3005),
  NEXT_PUBLIC_API_GATEWAY_URL: z.string().url(),
  API_GATEWAY_INTERNAL_URL: z.string().url().optional(),
});

envSchema.parse(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
