import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

const GLOBAL_PREFIX = 'api';
const DEFAULT_FRONTEND_ORIGIN = 'http://localhost:4200';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);

  const origins = (config.get<string>('FRONTEND_ORIGINS', DEFAULT_FRONTEND_ORIGIN))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type'],
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AdminPulse Backend')
    .setDescription('Domain-oriented proxy in front of the AdminPulse API.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  Logger.log(
    `🚀 Backend listening on http://localhost:${port}/${GLOBAL_PREFIX} (CORS: ${origins.join(', ')})`,
  );
}

void bootstrap();
