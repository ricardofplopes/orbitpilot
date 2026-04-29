import { IsString, IsArray } from 'class-validator';

export class GithubConfigDto {
  @IsString()
  org: string;

  @IsArray()
  @IsString({ each: true })
  repositories: string[];

  @IsString()
  token: string;
}
