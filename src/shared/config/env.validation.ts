import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @MinLength(32)
  JWT_SECRET_KEY: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  FILE_TOKEN_SECRET?: string;

  @IsString()
  JWT_EXPIRATION_TIME: string;

  @IsNumber()
  PORT: number;

  @ValidateIf((env) => env.DATA_BACKEND !== 'postgres')
  @IsString()
  MONGO_DB_URI?: string;

  @IsString()
  EMAIL_USER: string;

  @IsString()
  EMAIL_PASS: string;

  @IsString()
  GEMINI_API_KEY: string;

  @IsOptional()
  @IsIn(['mongo', 'postgres'])
  DATA_BACKEND?: 'mongo' | 'postgres';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
