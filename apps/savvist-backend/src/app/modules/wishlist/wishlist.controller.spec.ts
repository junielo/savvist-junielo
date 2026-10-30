/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';

describe('WishlistController', () => {
  let controller: WishlistController;
  let service: WishlistService;

  const userId = new Types.ObjectId('665f1c2a9b1e8a0012a1b001');
  const itemId = new Types.ObjectId('665f1c2a9b1e8a0012a1d001');
  const mockUser = { _id: userId } as UserDocument;

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateType: jest.fn(),
      remove: jest.fn(),
      purchase: jest.fn(),
      undoPurchase: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WishlistController],
      providers: [
        {
          provide: WishlistService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(CurrentUserGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<WishlistController>(WishlistController);
    service = module.get<WishlistService>(WishlistService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate findAll to service with userId', async () => {
    const expected = [{ _id: itemId, name: 'Keyboard' }];
    jest.spyOn(service, 'findAll').mockResolvedValue(expected as any);

    const result = await controller.findAll(mockUser);
    expect(service.findAll).toHaveBeenCalledWith(userId);
    expect(result).toBe(expected);
  });

  it('should delegate findOne to service with userId and id', async () => {
    const expected = { _id: itemId, name: 'Keyboard' };
    jest.spyOn(service, 'findOne').mockResolvedValue(expected as any);

    const result = await controller.findOne(mockUser, itemId);
    expect(service.findOne).toHaveBeenCalledWith(userId, itemId);
    expect(result).toBe(expected);
  });

  it('should delegate create to service with userId and dto', async () => {
    const dto = { name: 'Keyboard', amount: 5000, priority: 'important' };
    const expected = { _id: itemId, ...dto, userId };
    jest.spyOn(service, 'create').mockResolvedValue(expected as any);

    const result = await controller.create(mockUser, dto);
    expect(service.create).toHaveBeenCalledWith(userId, dto);
    expect(result).toBe(expected);
  });

  it('should delegate update to service with userId, id and dto', async () => {
    const dto = { amount: 5500 };
    const expected = { _id: itemId, amount: 5500, userId };
    jest.spyOn(service, 'update').mockResolvedValue(expected as any);

    const result = await controller.update(mockUser, itemId, dto);
    expect(service.update).toHaveBeenCalledWith(userId, itemId, dto);
    expect(result).toBe(expected);
  });

  it('should delegate updateType to service with userId, id and priority', async () => {
    const expected = { _id: itemId, priority: 'asap' };
    jest.spyOn(service, 'updateType').mockResolvedValue(expected as any);

    const dto = { getPriority: () => 'asap' } as any;
    const result = await controller.updateType(mockUser, itemId, dto);
    expect(service.updateType).toHaveBeenCalledWith(userId, itemId, 'asap');
    expect(result).toBe(expected);
  });

  it('should delegate purchase to service with userId and id', async () => {
    const expected = { _id: itemId, status: 'purchased' };
    jest.spyOn(service, 'purchase').mockResolvedValue(expected as any);

    const result = await controller.purchase(mockUser, itemId);
    expect(service.purchase).toHaveBeenCalledWith(userId, itemId);
    expect(result).toBe(expected);
  });

  it('should delegate undoPurchase to service with userId and id', async () => {
    const expected = { _id: itemId, status: 'pending' };
    jest.spyOn(service, 'undoPurchase').mockResolvedValue(expected as any);

    const result = await controller.undoPurchase(mockUser, itemId);
    expect(service.undoPurchase).toHaveBeenCalledWith(userId, itemId);
    expect(result).toBe(expected);
  });

  it('should delegate remove to service with userId and id', async () => {
    const expected = { deleted: true, _id: itemId.toString() };
    jest.spyOn(service, 'remove').mockResolvedValue(expected as any);

    const result = await controller.remove(mockUser, itemId);
    expect(service.remove).toHaveBeenCalledWith(userId, itemId);
    expect(result).toBe(expected);
  });
});
