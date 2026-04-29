import { IsString, IsOptional, IsNumber, IsUUID, IsEnum } from 'class-validator';
import { TeamRole } from '../../common/enums';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(TeamRole)
  role?: TeamRole;

  @IsOptional()
  @IsNumber()
  weeklyCapacity?: number;
}
