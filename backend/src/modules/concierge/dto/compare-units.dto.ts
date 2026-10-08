import { ArrayMaxSize, ArrayMinSize, IsUUID } from 'class-validator';

export class CompareUnitsDto {
  @IsUUID('all', { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(4)
  ids: string[];
}
