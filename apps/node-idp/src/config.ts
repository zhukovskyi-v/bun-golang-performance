import 'dotenv/config'
import {z} from 'zod';

const schema = z.object({
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(16),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
    PORT: z.coerce.number().int().positive().default(8080),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
    console.error(JSON.stringify({level: 'fatal', msg: 'invalid env', issues: parsed.error.flatten()}));
    process.exit(1);
}

export const config = {
    databaseUrl: parsed.data.DATABASE_URL,
    jwtSecret: parsed.data.JWT_SECRET,
    otelEndpoint: parsed.data.OTEL_EXPORTER_OTLP_ENDPOINT,
    otelHeaders: parsed.data.OTEL_EXPORTER_OTLP_HEADERS,
    port: parsed.data.PORT,
} as const;
