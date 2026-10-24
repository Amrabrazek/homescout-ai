import { BadRequestException, PipeTransform } from '@nestjs/common';

/** Chat IDs are made by the browser, so they are checked like any input. */
export class ParseChatIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(value)) {
      throw new BadRequestException('Invalid chat ID');
    }
    return value;
  }
}
