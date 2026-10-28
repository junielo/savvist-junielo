import { ExecutionContext } from '@nestjs/common';
import { CurrentUserGuard } from './current-user.guard';
import { UsersService } from '../../modules/users/users.service';

describe('CurrentUserGuard', () => {
  it('should be defined', () => {
    expect(new CurrentUserGuard()).toBeDefined();
  });

  it('should attach user to request if usersService is present', async () => {
    const mockUser = { _id: 'user123', displayName: 'User A' };
    const mockUsersService = {
      findCurrent: jest.fn().mockResolvedValue(mockUser),
    } as unknown as UsersService;

    const guard = new CurrentUserGuard(mockUsersService);
    const mockRequest: { user?: unknown } = {};
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    const canActivate = await guard.canActivate(mockContext);
    expect(canActivate).toBe(true);
    expect(mockRequest.user).toEqual(mockUser);
  });
});
