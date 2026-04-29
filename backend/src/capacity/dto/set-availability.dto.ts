import { IsString, IsNumber, IsDateString } from 'class-validator';

export class SetAvailabilityDto {
  @IsString()
  teamMemberId: string;

  @IsDateString()
  date: string;

  @IsString()
  type: string;

  @IsNumber()
  hours: number;
}
