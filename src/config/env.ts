import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
});

export type Env = z.infer<typeof envSchema>;

export function readEnv(): Env {
  return envSchema.parse(process.env);
}
