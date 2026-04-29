import { IsString, IsDateString } from 'class-validator';

export class CreateQuarterDto {
  @IsString()
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
