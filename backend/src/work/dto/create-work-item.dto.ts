import { IsString, IsOptional, IsNumber, IsEnum, IsUUID } from 'class-validator';
import { WorkItemStatus, Priority, WorkItemSource } from '../../common/enums';

export class CreateWorkItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkItemSource)
  source?: WorkItemSource;

  @IsOptional()
  @IsEnum(WorkItemStatus)
  status?: WorkItemStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  initiativeId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class UpdateWorkItemDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(WorkItemSource)
  source?: WorkItemSource;

  @IsOptional()
  @IsEnum(WorkItemStatus)
  status?: WorkItemStatus;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsNumber()
  storyPoints?: number;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsUUID()
  teamId?: string;

  @IsOptional()
  @IsUUID()
  initiativeId?: string;

  @IsOptional()
  @IsString()
  externalId?: string;
}
