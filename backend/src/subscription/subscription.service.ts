import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SubscriptionLevel, User } from '@prisma/client';

@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Check if user's subscription level meets or exceeds the required level
   */
  async checkSubscriptionAccess(
    user: User,
    requiredLevel: SubscriptionLevel,
  ): Promise<boolean> {
    // Get effective subscription level (handles expiry)
    const effectiveLevel = await this.getEffectiveSubscriptionLevel(user);

    // Get tier hierarchy
    const tierHierarchy = {
      [SubscriptionLevel.FREE]: 0,
      [SubscriptionLevel.BASIC]: 1,
      [SubscriptionLevel.PRO]: 2,
      [SubscriptionLevel.PREMIUM]: 3,
    };

    const userTier = tierHierarchy[effectiveLevel] || 0;
    const requiredTier = tierHierarchy[requiredLevel] || 0;

    return userTier >= requiredTier;
  }

  /**
   * Check if user has an active subscription (not expired)
   */
  async isSubscriptionActive(user: User): Promise<boolean> {
    if (user.subscriptionLevel === SubscriptionLevel.FREE) {
      return true; // FREE tier is always "active"
    }

    if (!user.subscriptionExpiry) {
      return false; // Paid tier without expiry date is invalid
    }

    return user.subscriptionExpiry >= new Date();
  }

  /**
   * Get user's effective subscription level (considering expiry)
   */
  async getEffectiveSubscriptionLevel(user: User): Promise<SubscriptionLevel> {
    if (user.subscriptionLevel === SubscriptionLevel.FREE) {
      return SubscriptionLevel.FREE;
    }

    if (!user.subscriptionExpiry || user.subscriptionExpiry < new Date()) {
      // Expired, auto-downgrade to FREE
      await this.prisma.user.update({
        where: { id: user.id },
        data: { subscriptionLevel: SubscriptionLevel.FREE },
      });
      return SubscriptionLevel.FREE;
    }

    return user.subscriptionLevel;
  }
}
