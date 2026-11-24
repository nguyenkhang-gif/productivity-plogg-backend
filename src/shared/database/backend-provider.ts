import { ConfigService } from '@nestjs/config';
import { Provider, Type } from '@nestjs/common';

export type DataBackend = 'mongo' | 'postgres';

export function resolveBackend(config: ConfigService): DataBackend {
  return config.get<string>('DATA_BACKEND') === 'postgres'
    ? 'postgres'
    : 'mongo';
}

/**
 * Binds a repository token to the Mongo or Prisma implementation depending on
 * DATA_BACKEND. The module must also list both concrete classes as providers.
 */
export function backendProvider<T>(
  token: string | symbol,
  MongoImpl: Type<T>,
  PrismaImpl: Type<T>,
): Provider {
  return {
    provide: token,
    inject: [ConfigService, MongoImpl, PrismaImpl],
    useFactory: (config: ConfigService, mongo: T, prisma: T): T =>
      resolveBackend(config) === 'postgres' ? prisma : mongo,
  };
}
