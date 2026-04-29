import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateWorkItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  initiativeId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
