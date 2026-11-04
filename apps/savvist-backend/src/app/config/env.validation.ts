import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsOptional()
  @IsEnum(Environment)
  NODE_ENV?: Environment;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  MONGODB_URI!: string;

  @IsString()
  @IsNotEmpty()
  TYPESAFE_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  JEV_MODEL!: string;

  @IsString()
  @IsNotEmpty()
  GOOGLE_API_KEY!: string;

  @IsString()
  @IsNotEmpty()
  GEMINI_MODEL!: string;

  @IsOptional()
  @IsBoolean()
  LANGSMITH_TRACING?: boolean;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  LANGSMITH_ENDPOINT?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  LANGSMITH_API_KEY?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  LANGSMITH_PROJECT?: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validated;
}