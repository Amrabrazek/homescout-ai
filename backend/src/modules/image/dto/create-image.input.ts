import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@InputType()
export class CreateImageInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  url: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  altText?: string;
}
