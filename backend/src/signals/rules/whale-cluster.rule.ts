import { Injectable } from '@nestjs/common';
import { IRule, RuleContext, RuleResult } from '../interfaces/rule.interface';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * RULE E — Whale Cluster (Multiple Addresses)
 * Detects multiple large buys to distinct wallets within a short window (1h).
 * This indicates coordinated accumulation or smart money activity.
 */
@Injectable()
export class WhaleClusterRule implements IRule {
  readonly name = 'WhaleClusterRule';
  readonly maxScore = 18;

  constructor(private prisma: PrismaService) {}

  async evaluate(context: RuleContext): Promise<RuleResult> {
    const { event, tokenMetadata, config } = context;

    // Skip if amountUSD is not available
    if (!event.amountUsd || event.amountUsd <= 0) {
      return {
        triggered: false,
        score: 0,
        reason: 'Missing or invalid amountUSD',
        evidence: {},
        ruleName: this.name,
      };
    }

    // Only check if this event itself is a large transfer
    const threshold = config.largeTransferUsd;
    if (event.amountUsd < threshold) {
      return {
        triggered: false,
        score: 0,
        reason: `Event amount ($${event.amountUsd.toFixed(2)}) below cluster threshold ($${threshold.toFixed(2)})`,
        evidence: {},
        ruleName: this.name,
      };
    }

    // Look for other large transfers to distinct wallets within the last hour
    const oneHourAgo = new Date(event.timestamp);
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const recentLargeTransfers = await this.prisma.normalizedEvent.findMany({
      where: {
        tokenContract: event.tokenContract,
        chain: event.chain,
        type: 'transfer',
        timestamp: {
          gte: oneHourAgo,
          lte: event.timestamp,
        },
        amountUsd: {
          gte: threshold,
        },
        // Exclude the current event
        eventId: {
          not: event.eventId,
        },
      },
      select: {
        toAddress: true,
        amountUsd: true,
        txHash: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Get distinct recipient addresses
    const distinctWallets = new Set<string>();
    const walletAmounts: Array<{ wallet: string; amountUsd: number; txHash: string }> = [];

    // Add current event
    distinctWallets.add(event.toAddress);
    walletAmounts.push({
      wallet: event.toAddress,
      amountUsd: event.amountUsd,
      txHash: event.txHash,
    });

    // Add other recent transfers
    for (const transfer of recentLargeTransfers) {
      if (!distinctWallets.has(transfer.toAddress)) {
        distinctWallets.add(transfer.toAddress);
        walletAmounts.push({
          wallet: transfer.toAddress,
          amountUsd: transfer.amountUsd || 0,
          txHash: transfer.txHash,
        });
      }
    }

    // Need at least 3 distinct wallets to trigger (configurable)
    const minWallets = 3;
    const triggered = distinctWallets.size >= minWallets;

    if (!triggered) {
      return {
        triggered: false,
        score: 0,
        reason: `Only ${distinctWallets.size} distinct wallet(s) received large transfers (need ${minWallets}+)`,
        evidence: {
          distinctWallets: distinctWallets.size,
          minWallets,
          totalAmountUsd: walletAmounts.reduce((sum, w) => sum + w.amountUsd, 0),
        },
        ruleName: this.name,
      };
    }

    // Calculate total amount across all wallets
    const totalAmountUsd = walletAmounts.reduce((sum, w) => sum + w.amountUsd, 0);

    // Score increases with more wallets (up to maxScore)
    // Base score for 3 wallets, increases for each additional wallet
    const baseScore = 12;
    const additionalWallets = Math.max(0, distinctWallets.size - minWallets);
    const score = Math.min(
      this.maxScore,
      baseScore + Math.min(additionalWallets * 2, 6), // +2 per wallet, max +6
    );

    return {
      triggered: true,
      score,
      reason: `Whale cluster detected: ${distinctWallets.size} distinct wallets received large transfers (total: $${totalAmountUsd.toFixed(2)}) within 1 hour`,
      evidence: {
        distinctWallets: distinctWallets.size,
        wallets: walletAmounts.map((w) => ({
          address: w.wallet,
          amountUsd: w.amountUsd,
          txHash: w.txHash,
        })),
        totalAmountUsd,
        timeWindow: '1 hour',
        threshold,
      },
      ruleName: this.name,
    };
  }
}

