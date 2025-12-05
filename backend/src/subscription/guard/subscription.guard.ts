import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionLevel } from '@prisma/client';
import { REQUIRE_SUBSCRIPTION_KEY } from '../decorator/require-subscription.decorator';
import { SubscriptionService } from '../subscription.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredLevel = this.reflector.getAllAndOverride<SubscriptionLevel>(
      REQUIRE_SUBSCRIPTION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no subscription requirement, allow access
    if (!requiredLevel) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Check if subscription is active and meets requirement
    const hasAccess = await this.subscriptionService.checkSubscriptionAccess(
      user,
      requiredLevel,
    );

    if (!hasAccess) {
      const subscriptionName = this.getSubscriptionName(requiredLevel);
      throw new ForbiddenException(
        `This feature requires ${subscriptionName} subscription or higher`,
      );
    }

    return true;
  }

  private getSubscriptionName(level: SubscriptionLevel): string {
    const names = {
      [SubscriptionLevel.FREE]: 'Free',
      [SubscriptionLevel.BASIC]: 'Basic',
      [SubscriptionLevel.PRO]: 'Pro',
      [SubscriptionLevel.PREMIUM]: 'Premium',
    };
    return names[level] || level;
  }
}

