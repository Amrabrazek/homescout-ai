import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { isUUID } from 'class-validator';

export const BUYER_ID_HEADER = 'x-buyer-id';

/**
 * The anonymous buyer's ID. The web app keeps it in the `hs_buyer` cookie and
 * forwards it in this header from its server, so the API never reads cookies.
 */
export const BuyerId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string => {
    const req =
      context.getType<string>() === 'graphql'
        ? GqlExecutionContext.create(context).getContext().req
        : context.switchToHttp().getRequest();
    const buyerId = req?.headers?.[BUYER_ID_HEADER];
    if (typeof buyerId !== 'string' || !isUUID(buyerId)) {
      throw new BadRequestException(
        `Missing or invalid ${BUYER_ID_HEADER} header`
      );
    }
    return buyerId;
  }
);
