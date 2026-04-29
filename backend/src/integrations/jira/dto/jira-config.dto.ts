import { IsString, IsArray, IsOptional } from 'class-validator';

export class JiraConfigDto {
  @IsString()
  baseUrl: string;

  @IsString()
  email: string;

  @IsString()
  apiToken: string;

  @IsArray()
  @IsString({ each: true })
  projectKeys: string[];
}
