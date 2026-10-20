import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RememberFactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  text: string;
}
