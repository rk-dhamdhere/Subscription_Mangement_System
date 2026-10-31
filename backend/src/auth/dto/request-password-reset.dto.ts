import { IsEmail, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}
