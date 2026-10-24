import { ArrayMaxSize, IsArray, IsObject } from 'class-validator';

export class SaveConversationDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsObject({ each: true })
  messages: Record<string, unknown>[];
}
