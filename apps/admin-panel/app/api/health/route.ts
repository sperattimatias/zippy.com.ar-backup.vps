import pino from 'pino';

const logger = pino({ name: 'admin-panel' });

export async function GET() {
  logger.info({ route: '/api/health' }, 'health check requested');

  return Response.json({
    status: 'ok',
    service: 'admin-panel',
    timestamp: new Date().toISOString(),
  });
}
