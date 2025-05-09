import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

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

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
