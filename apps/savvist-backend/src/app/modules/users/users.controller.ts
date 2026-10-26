import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  get() {
    return this.usersService.findCurrent();
  }

  @Patch()
  update(@Body() dto: UpdateUserDto) {
    return this.usersService.updateCurrent(dto);
  }
}