import { IsString, IsOptional, IsUUID, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { AvailabilityType } from '../../common/enums';

export class SetAvailabilityDto {
  @IsUUID()
  teamMemberId: string;

  @IsDateString()
  date: string;

  @IsEnum(AvailabilityType)
  type: AvailabilityType;

  @IsNumber()
  hours: number;
}
