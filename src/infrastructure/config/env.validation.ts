import { plainToInstance } from 'class-transformer';
import { IsNumber, IsString, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  JWT_SECRET_KEY: string;

  @IsString()
  JWT_EXPIRATION_TIME: string;

  @IsNumber()
  PORT: number;

  @IsString()
  MONGO_DB_URI: string;

  @IsString()
  EMAIL_USER: string;

  @IsString()
  EMAIL_PASS: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    config,
    { enableImplicitConversion: true },
  );
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
