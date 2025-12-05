import { SetMetadata } from '@nestjs/common';
import { SubscriptionLevel } from '@prisma/client';

export const REQUIRE_SUBSCRIPTION_KEY = 'requireSubscription';
export const RequireSubscription = (level: SubscriptionLevel) =>
  SetMetadata(REQUIRE_SUBSCRIPTION_KEY, level);

