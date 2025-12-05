import { PrismaClient, SubscriptionLevel } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test users
  const testPassword = await argon2.hash('test123456');

  // Test user with FREE subscription
  const freeUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      password: testPassword,
      subscriptionLevel: SubscriptionLevel.FREE,
    },
  });

  // Test user with BASIC subscription
  const basicUser = await prisma.user.upsert({
    where: { email: 'basic@example.com' },
    update: {},
    create: {
      email: 'basic@example.com',
      password: testPassword,
      subscriptionLevel: SubscriptionLevel.BASIC,
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  // Test user with PRO subscription
  const proUser = await prisma.user.upsert({
    where: { email: 'pro@example.com' },
    update: {},
    create: {
      email: 'pro@example.com',
      password: testPassword,
      subscriptionLevel: SubscriptionLevel.PRO,
      subscriptionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  console.log('✅ Created test users:');
  console.log('   - test@example.com (FREE) - Password: test123456');
  console.log('   - basic@example.com (BASIC) - Password: test123456');
  console.log('   - pro@example.com (PRO) - Password: test123456');

  // Create sample coins (using symbol as unique identifier for upsert)
  // Note: Since Coin doesn't have unique symbol, we'll use findFirst or create
  let ethCoin = await prisma.coin.findFirst({
    where: { symbol: 'ETH', chain: 'ETHEREUM' },
  });
  if (!ethCoin) {
    ethCoin = await prisma.coin.create({
      data: {
        name: 'Ethereum',
        symbol: 'ETH',
        contractAddress: '0x0000000000000000000000000000000000000000',
        chain: 'ETHEREUM',
        totalSupply: 120000000,
        circulatingSupply: 118000000,
        priceUsd: 2500.50,
        liquidityUsd: 10000000,
      },
    });
  }

  let usdcCoin = await prisma.coin.findFirst({
    where: { symbol: 'USDC', chain: 'ETHEREUM' },
  });
  if (!usdcCoin) {
    usdcCoin = await prisma.coin.create({
      data: {
        name: 'USD Coin',
        symbol: 'USDC',
        contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        chain: 'ETHEREUM',
        totalSupply: 30000000000,
        circulatingSupply: 28000000000,
        priceUsd: 1.00,
        liquidityUsd: 5000000,
      },
    });
  }

  let linkCoin = await prisma.coin.findFirst({
    where: { symbol: 'LINK', chain: 'ETHEREUM' },
  });
  if (!linkCoin) {
    linkCoin = await prisma.coin.create({
      data: {
        name: 'Chainlink',
        symbol: 'LINK',
        contractAddress: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
        chain: 'ETHEREUM',
        totalSupply: 1000000000,
        circulatingSupply: 550000000,
        priceUsd: 15.50,
        liquidityUsd: 8000000,
      },
    });
  }

  console.log('✅ Created sample coins: ETH, USDC, LINK');

  // Create sample accumulation signals
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  await prisma.accumulationSignal.createMany({
    data: [
      {
        coinId: ethCoin.id,
        amountUnits: 100,
        amountUsd: 250000,
        supplyPercentage: 0.0001,
        liquidityRatio: 1.2,
        score: 85,
        createdAt: oneHourAgo,
      },
      {
        coinId: linkCoin.id,
        amountUnits: 5000,
        amountUsd: 77500,
        supplyPercentage: 0.0009,
        liquidityRatio: 1.5,
        score: 78,
        createdAt: twoHoursAgo,
      },
      {
        coinId: usdcCoin.id,
        amountUnits: 500000,
        amountUsd: 500000,
        supplyPercentage: 0.0018,
        liquidityRatio: 1.1,
        score: 72,
        createdAt: oneHourAgo,
      },
      {
        coinId: ethCoin.id,
        amountUnits: 200,
        amountUsd: 500000,
        supplyPercentage: 0.0002,
        liquidityRatio: 1.3,
        score: 90,
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created sample accumulation signals');

  // Create sample market signals
  await prisma.marketSignal.createMany({
    data: [
      {
        coinId: ethCoin.id,
        signalType: 'VOLUME_SPIKE',
        score: 82,
        details: {
          volume24h: 5000000,
          priceChange24h: 5.2,
        },
        createdAt: oneHourAgo,
      },
      {
        coinId: linkCoin.id,
        signalType: 'PRICE_ANOMALY',
        score: 75,
        details: {
          volume24h: 10000000,
          priceChange24h: -2.1,
        },
        createdAt: twoHoursAgo,
      },
      {
        coinId: usdcCoin.id,
        signalType: 'DEX_ACTIVITY',
        score: 68,
        details: {
          volume24h: 2000000,
          priceChange24h: 0.1,
        },
        createdAt: oneHourAgo,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Created sample market signals');

  // Create user settings for test users
  await prisma.userSettings.upsert({
    where: { userId: freeUser.id },
    update: {},
    create: {
      userId: freeUser.id,
      emailEnabled: true,
      telegramEnabled: false,
      notificationsEnabled: true,
      minSignalScore: 65,
      cooldownMinutes: 30,
    },
  });

  await prisma.userSettings.upsert({
    where: { userId: basicUser.id },
    update: {},
    create: {
      userId: basicUser.id,
      emailEnabled: true,
      telegramEnabled: false,
      notificationsEnabled: true,
      minSignalScore: 70,
      cooldownMinutes: 20,
    },
  });

  console.log('✅ Created user settings');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Test Credentials:');
  console.log('   Email: test@example.com');
  console.log('   Password: test123456');
  console.log('   Subscription: FREE');
  console.log('\n   Email: basic@example.com');
  console.log('   Password: test123456');
  console.log('   Subscription: BASIC');
  console.log('\n   Email: pro@example.com');
  console.log('   Password: test123456');
  console.log('   Subscription: PRO');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

