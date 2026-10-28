import { CanActivate, ExecutionContext, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';

@Injectable()
export class CurrentUserGuard implements CanActivate {
  constructor(@Optional() private readonly usersService?: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (!request.user && this.usersService) {
      const user = await this.usersService.findCurrent();
      if (!user) {
        throw new NotFoundException('Current user not found');
      }
      request.user = user;
    }
    return true;
  }
}
