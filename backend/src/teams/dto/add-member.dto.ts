import { IsString, IsOptional, IsNumber } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsNumber()
  weeklyCapacity?: number;
}
