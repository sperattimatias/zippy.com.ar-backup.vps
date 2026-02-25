import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';

@Catch()
class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();
    const isHttp = exception instanceof HttpException;
    const httpException = isHttp ? (exception as HttpException) : null;
    const status = httpException ? httpException.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse = httpException?.getResponse() as any;
    const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
    let message = errorResponse?.message ?? httpException?.message ?? 'Internal server error';
    if (isProd && status >= 500) message = 'Internal server error';
    response.status(status).json({ success: false, error: { code: status, message }, request_id: request.id ?? request.headers['x-request-id'] ?? null, timestamp: new Date().toISOString(), path: request.url });
  }
}

function applySecurity(app: any, config: ConfigService) {
  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  const origin = config.get<string>('CORS_ORIGIN', '*');
  app.enableCors({ origin: origin === '*' ? true : origin.split(',').map((v) => v.trim()), credentials: true });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const logger = app.get(PinoLogger);
  app.useLogger(logger);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  const config = app.get(ConfigService);
  applySecurity(app, config);

  const nodeEnv = config.get<string>('NODE_ENV', 'development');
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder().setTitle('Zippy API Gateway').setDescription('Gateway API docs and entrypoint for backend services').setVersion('1.0.0').addBearerAuth().build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  const port = config.get<number>('API_GATEWAY_PORT', 3000);
  await app.listen(port, '0.0.0.0');
  Logger.log(`API Gateway running on ${port}`, 'Bootstrap');
}

bootstrap();
