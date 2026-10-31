import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompletePasswordResetDto {
  @ApiProperty({
    description: 'Single-use token delivered to the account email.',
  })
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  token!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9])/, {
    message:
      'password must include uppercase, lowercase, and special characters',
  })
  password!: string;
}
