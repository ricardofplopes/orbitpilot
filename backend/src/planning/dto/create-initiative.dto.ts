import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateInitiativeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsNumber()
  estimatedEffort?: number;
}
