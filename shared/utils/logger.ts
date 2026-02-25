import { randomUUID } from 'crypto';

export const defaultPinoConfig = {
  pinoHttp: {
    level: process.env.LOG_LEVEL ?? 'info',
    genReqId: (req: any) => {
      const incoming = req?.headers?.['x-request-id'];
      const reqId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
      req.id = reqId;
      return reqId;
    },
    customProps: (req: any) => ({ request_id: req?.id }),
    transport:
      process.env.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: { singleLine: true, colorize: true },
          }
        : undefined,
    redact: ['req.headers.authorization'],
  },
};
