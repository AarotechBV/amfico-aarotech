import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app/app.module';

const GLOBAL_PREFIX = 'api';
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:4200';
const JSON_BODY_LIMIT = '100kb';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  // Behind Render + Cloudflare. Trusting exactly one hop gives correct
  // req.ip for the throttler and accurate logs without trusting forged
  // X-Forwarded-For headers from arbitrary clients.
  app.set('trust proxy', 1);
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: JSON_BODY_LIMIT, extended: true });

  app.use(
    helmet({
      // No CSP from the API — responses are JSON consumed by the SPA;
      // the SPA enforces its own headers via Cloudflare Pages _headers.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const origins = config
    .get<string>('FRONTEND_ORIGINS', DEFAULT_FRONTEND_ORIGIN)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Active-Office'],
  });

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger UI is dev-only. The OpenAPI spec lists every endpoint +
  // its guards — that's a roadmap for an attacker in production.
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Amfitech Backend')
      .setDescription('Domain-oriented proxy in front of the AdminPulse API.')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(
    `🚀 Backend listening on http://localhost:${port}/${GLOBAL_PREFIX} (CORS: ${origins.join(', ')})`,
  );
}

void bootstrap();
