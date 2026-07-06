import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

export class VaultKdfDto {
  /** e.g. "argon2id" or "PBKDF2-SHA256" — opaque to the server. */
  @IsString()
  @Length(1, 32)
  algo: string;

  @IsString()
  @Length(4, 128)
  @Matches(BASE64_RE, { message: 'salt must be base64' })
  salt: string;

  @IsInt()
  @Min(1)
  @Max(10_000_000)
  iterations: number;
}

export class PutVaultDto {
  /** Size cap (64KB binary) is enforced in the use-case as 413. */
  @IsString()
  @IsNotEmpty()
  @Matches(BASE64_RE, { message: 'ciphertext must be base64' })
  ciphertext: string;

  /** 12 bytes base64-encoded = exactly 16 chars. */
  @IsString()
  @Length(16, 16, { message: 'iv must encode exactly 12 bytes' })
  @Matches(BASE64_RE, { message: 'iv must be base64' })
  iv: string;

  @IsString()
  @Length(4, 512)
  @Matches(BASE64_RE, { message: 'wrappedKey must be base64' })
  wrappedKey: string;

  @ValidateNested()
  @Type(() => VaultKdfDto)
  kdf: VaultKdfDto;

  /** Omit to create; must match the stored version to update (else 409). */
  @IsOptional()
  @IsInt()
  @Min(1)
  baseVersion?: number;
}
