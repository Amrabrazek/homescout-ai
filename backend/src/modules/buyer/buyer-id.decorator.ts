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
    const buyerId = readBuyerId(context);
    if (!buyerId) {
      throw new BadRequestException(
        `Missing or invalid ${BUYER_ID_HEADER} header`
      );
    }
    return buyerId;
  }
);

/** Like BuyerId, but null for anonymous callers (e.g. the browser's own Apollo client). */
export const OptionalBuyerId = createParamDecorator(
  (_: unknown, context: ExecutionContext): string | null => readBuyerId(context)
);

function readBuyerId(context: ExecutionContext): string | null {
  const req =
    context.getType<string>() === 'graphql'
      ? GqlExecutionContext.create(context).getContext().req
      : context.switchToHttp().getRequest();
  const buyerId = req?.headers?.[BUYER_ID_HEADER];
  return typeof buyerId === 'string' && isUUID(buyerId) ? buyerId : null;
}
