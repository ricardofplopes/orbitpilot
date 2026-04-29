import { IsString, IsOptional, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { Priority, InitiativeStatus } from '../../common/enums';

export class CreateInitiativeDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsNumber()
  estimatedEffort?: number;
}

export class UpdateInitiativeDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsNumber()
  estimatedEffort?: number;

  @IsOptional()
  @IsEnum(InitiativeStatus)
  status?: InitiativeStatus;
}
