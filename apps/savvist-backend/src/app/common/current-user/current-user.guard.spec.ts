import { CurrentUserGuard } from './current-user.guard';

describe('CurrentUserGuard', () => {
  it('should be defined', () => {
    expect(new CurrentUserGuard()).toBeDefined();
  });
});
