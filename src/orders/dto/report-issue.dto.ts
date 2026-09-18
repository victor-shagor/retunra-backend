import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ReportIssueDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
