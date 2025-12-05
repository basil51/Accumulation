import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: any;
  let alertsQueue: any;

  const mockPrismaService = {
    alert: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: getQueueToken('alerts'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prisma = module.get(PrismaService);
    alertsQueue = module.get(getQueueToken('alerts'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAlert', () => {
    it('should create an alert and enqueue notification', async () => {
      const input = {
        userId: 'user-1',
        signalType: 'accumulation' as const,
        signalId: 'signal-1',
        title: 'Test Alert',
        message: 'Test message',
        coinId: 'coin-1',
        score: 75,
      };

      const mockAlert = {
        id: 'alert-1',
        ...input,
        read: false,
        createdAt: new Date(),
        coin: {
          id: 'coin-1',
          name: 'Test Coin',
          symbol: 'TEST',
          contractAddress: '0x123',
          chain: 'ethereum',
        },
      };

      prisma.alert.create.mockResolvedValue(mockAlert as any);
      mockQueue.add.mockResolvedValue({} as any);

      const result = await service.createAlert(input);

      expect(result).toEqual(mockAlert);
      expect(prisma.alert.create).toHaveBeenCalledWith({
        data: {
          userId: input.userId,
          signalType: input.signalType,
          signalId: input.signalId,
          title: input.title,
          message: input.message,
          coinId: input.coinId,
          score: input.score,
        },
        include: {
          coin: {
            select: {
              id: true,
              name: true,
              symbol: true,
              contractAddress: true,
              chain: true,
            },
          },
        },
      });
      expect(mockQueue.add).toHaveBeenCalledWith('send-notifications', {
        alertId: 'alert-1',
      });
    });

    it('should handle errors when creating alert', async () => {
      const input = {
        userId: 'user-1',
        signalType: 'market' as const,
        signalId: 'signal-1',
        title: 'Test Alert',
        message: 'Test message',
        score: 75,
      };

      const error = new Error('Database error');
      prisma.alert.create.mockRejectedValue(error);

      await expect(service.createAlert(input)).rejects.toThrow('Database error');
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('findUserAlerts', () => {
    it('should return user alerts with pagination', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'Alert 1',
          read: false,
          coin: null,
        },
        {
          id: 'alert-2',
          title: 'Alert 2',
          read: true,
          coin: null,
        },
      ];

      prisma.alert.findMany.mockResolvedValue(mockAlerts as any);
      prisma.alert.count
        .mockResolvedValueOnce(2) // total count
        .mockResolvedValueOnce(1); // unread count

      const result = await service.findUserAlerts('user-1', {
        page: 1,
        limit: 50,
      });

      expect(result.data).toEqual(mockAlerts);
      expect(result.meta.total).toBe(2);
      expect(result.meta.unread).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should filter by unread status', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          title: 'Unread Alert',
          read: false,
        },
      ];

      prisma.alert.findMany.mockResolvedValue(mockAlerts as any);
      prisma.alert.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      await service.findUserAlerts('user-1', { unread: true });

      expect(prisma.alert.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        include: {
          coin: {
            select: {
              id: true,
              name: true,
              symbol: true,
              contractAddress: true,
              chain: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('markAsRead', () => {
    it('should mark alert as read', async () => {
      const mockAlert = {
        id: 'alert-1',
        userId: 'user-1',
        read: false,
      };

      const updatedAlert = {
        ...mockAlert,
        read: true,
        readAt: new Date(),
      };

      prisma.alert.findUnique.mockResolvedValue(mockAlert as any);
      prisma.alert.update.mockResolvedValue(updatedAlert as any);

      const result = await service.markAsRead('alert-1', 'user-1');

      expect(result.read).toBe(true);
      expect(prisma.alert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });

    it('should throw error when alert not found', async () => {
      prisma.alert.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('invalid-id', 'user-1')).rejects.toThrow(
        'Alert invalid-id not found',
      );
    });

    it('should throw error when unauthorized', async () => {
      const mockAlert = {
        id: 'alert-1',
        userId: 'other-user',
        read: false,
      };

      prisma.alert.findUnique.mockResolvedValue(mockAlert as any);

      await expect(service.markAsRead('alert-1', 'user-1')).rejects.toThrow(
        'Unauthorized',
      );
    });

    it('should return alert if already read', async () => {
      const mockAlert = {
        id: 'alert-1',
        userId: 'user-1',
        read: true,
      };

      prisma.alert.findUnique.mockResolvedValue(mockAlert as any);

      const result = await service.markAsRead('alert-1', 'user-1');

      expect(result).toEqual(mockAlert);
      expect(prisma.alert.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all alerts as read', async () => {
      prisma.alert.updateMany.mockResolvedValue({ count: 5 } as any);

      const result = await service.markAllAsRead('user-1');

      expect(result.count).toBe(5);
      expect(prisma.alert.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          read: false,
        },
        data: {
          read: true,
          readAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateNotificationStatus', () => {
    it('should update email notification status', async () => {
      const updatedAlert = {
        id: 'alert-1',
        emailSent: true,
        emailSentAt: new Date(),
      };

      prisma.alert.update.mockResolvedValue(updatedAlert as any);

      const result = await service.updateNotificationStatus(
        'alert-1',
        'email',
        true,
      );

      expect(result.emailSent).toBe(true);
      expect(prisma.alert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          emailSent: true,
          emailSentAt: expect.any(Date),
        },
      });
    });

    it('should update telegram notification status', async () => {
      const updatedAlert = {
        id: 'alert-1',
        telegramSent: true,
        telegramSentAt: new Date(),
      };

      prisma.alert.update.mockResolvedValue(updatedAlert as any);

      const result = await service.updateNotificationStatus(
        'alert-1',
        'telegram',
        true,
      );

      expect(result.telegramSent).toBe(true);
      expect(prisma.alert.update).toHaveBeenCalledWith({
        where: { id: 'alert-1' },
        data: {
          telegramSent: true,
          telegramSentAt: expect.any(Date),
        },
      });
    });
  });

  describe('shouldSendAlert', () => {
    it('should return true when all conditions are met', async () => {
      const mockUser = {
        id: 'user-1',
        settings: {
          notificationsEnabled: true,
          minSignalScore: 65,
          cooldownMinutes: 30,
        },
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.alert.findFirst.mockResolvedValue(null);

      const result = await service.shouldSendAlert('user-1', 'coin-1', 75);

      expect(result).toBe(true);
    });

    it('should return false when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.shouldSendAlert('invalid-user', 'coin-1', 75);

      expect(result).toBe(false);
    });

    it('should return false when notifications disabled', async () => {
      const mockUser = {
        id: 'user-1',
        settings: {
          notificationsEnabled: false,
        },
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.shouldSendAlert('user-1', 'coin-1', 75);

      expect(result).toBe(false);
    });

    it('should return false when score below threshold', async () => {
      const mockUser = {
        id: 'user-1',
        settings: {
          notificationsEnabled: true,
          minSignalScore: 80,
        },
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.shouldSendAlert('user-1', 'coin-1', 70);

      expect(result).toBe(false);
    });

    it('should return false when in cooldown window', async () => {
      const mockUser = {
        id: 'user-1',
        settings: {
          notificationsEnabled: true,
          minSignalScore: 65,
          cooldownMinutes: 30,
        },
      };

      const recentAlert = {
        id: 'alert-1',
        createdAt: new Date(),
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.alert.findFirst.mockResolvedValue(recentAlert as any);

      const result = await service.shouldSendAlert('user-1', 'coin-1', 75);

      expect(result).toBe(false);
    });

    it('should use default values when settings are null', async () => {
      const mockUser = {
        id: 'user-1',
        settings: null,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser as any);
      prisma.alert.findFirst.mockResolvedValue(null);

      const result = await service.shouldSendAlert('user-1', 'coin-1', 70);

      expect(result).toBe(true); // 70 >= 65 (default minScore)
    });
  });
});

