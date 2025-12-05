import { Test, TestingModule } from '@nestjs/testing';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { NotFoundException } from '@nestjs/common';

describe('AlertsController', () => {
  let controller: AlertsController;
  let service: AlertsService;

  const mockAlertsService = {
    findUserAlerts: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlertsController],
      providers: [
        {
          provide: AlertsService,
          useValue: mockAlertsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AlertsController>(AlertsController);
    service = module.get<AlertsService>(AlertsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAlerts', () => {
    it('should return user alerts', async () => {
      const mockAlerts = {
        data: [
          {
            id: 'alert-1',
            title: 'Test Alert',
            message: 'Test message',
            read: false,
            coin: null,
          },
        ],
        meta: {
          total: 1,
          unread: 1,
          page: 1,
          limit: 50,
          totalPages: 1,
        },
      };

      mockAlertsService.findUserAlerts.mockResolvedValue(mockAlerts);

      const result = await controller.getAlerts(mockUser as any);

      expect(result).toEqual(mockAlerts);
      expect(mockAlertsService.findUserAlerts).toHaveBeenCalledWith('user-1', {
        unread: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('should filter by unread status', async () => {
      const mockAlerts = {
        data: [],
        meta: {
          total: 0,
          unread: 0,
          page: 1,
          limit: 50,
          totalPages: 0,
        },
      };

      mockAlertsService.findUserAlerts.mockResolvedValue(mockAlerts);

      await controller.getAlerts(mockUser as any, 'true');

      expect(mockAlertsService.findUserAlerts).toHaveBeenCalledWith('user-1', {
        unread: true,
        page: undefined,
        limit: undefined,
      });
    });

    it('should handle pagination', async () => {
      const mockAlerts = {
        data: [],
        meta: {
          total: 100,
          unread: 10,
          page: 2,
          limit: 20,
          totalPages: 5,
        },
      };

      mockAlertsService.findUserAlerts.mockResolvedValue(mockAlerts);

      await controller.getAlerts(mockUser as any, undefined, '2', '20');

      expect(mockAlertsService.findUserAlerts).toHaveBeenCalledWith('user-1', {
        unread: undefined,
        page: 2,
        limit: 20,
      });
    });
  });

  describe('markAlertAsRead', () => {
    it('should mark alert as read', async () => {
      const mockAlert = {
        id: 'alert-1',
        read: true,
        readAt: new Date(),
      };

      mockAlertsService.markAsRead.mockResolvedValue(mockAlert);

      const result = await controller.markAlertAsRead('alert-1', mockUser as any);

      expect(result).toEqual({ message: 'Alert marked as read' });
      expect(mockAlertsService.markAsRead).toHaveBeenCalledWith('alert-1', 'user-1');
    });

    it('should throw NotFoundException when alert not found', async () => {
      mockAlertsService.markAsRead.mockRejectedValue(
        new Error('Alert not found'),
      );

      await expect(
        controller.markAlertAsRead('invalid-id', mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when unauthorized', async () => {
      mockAlertsService.markAsRead.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        controller.markAlertAsRead('alert-1', mockUser as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAlertsAsRead', () => {
    it('should mark all alerts as read', async () => {
      const mockResult = {
        message: 'All alerts marked as read',
        count: 5,
      };

      mockAlertsService.markAllAsRead.mockResolvedValue(mockResult);

      const result = await controller.markAllAlertsAsRead(mockUser as any);

      expect(result).toEqual(mockResult);
      expect(mockAlertsService.markAllAsRead).toHaveBeenCalledWith('user-1');
    });
  });
});

