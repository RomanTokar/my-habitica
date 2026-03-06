import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cookie parsing middleware — required for JWT cookie auth
  app.use(cookieParser());

  // CORS — must include credentials: true so browsers send cookies
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  const port = parseInt(configService.get<string>('PORT', '3001'), 10);
  await app.listen(port);

  Logger.log(`API running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap().catch(console.error);
