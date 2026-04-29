import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';
import { QuarterPlanStatus } from '../../common/enums';

export class CreateQuarterDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}

export class UpdateQuarterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(QuarterPlanStatus)
  status?: QuarterPlanStatus;
}
