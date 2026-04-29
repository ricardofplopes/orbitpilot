import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  // Restrict CORS to the frontend origin
  const appUrl = process.env.APP_URL || 'http://localhost:3200';
  app.enableCors({ origin: [appUrl], credentials: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`OrbitPilot API running on port ${port}`);
  logger.log(`CORS allowed origin: ${appUrl}`);
}
bootstrap();
