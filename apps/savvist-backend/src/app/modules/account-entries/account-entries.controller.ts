import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AccountEntriesService } from './account-entries.service';
import { CreateAccountEntryDto } from './dto/create-account-entry.dto';
import { UpdateAccountEntryDto } from './dto/update-account-entry.dto';

@Controller('account-entries')
export class AccountEntriesController {
  constructor(private readonly accountEntriesService: AccountEntriesService) {}

  @Post()
  create(@Body() createAccountEntryDto: CreateAccountEntryDto) {
    return this.accountEntriesService.create(createAccountEntryDto);
  }

  @Get()
  findAll() {
    return this.accountEntriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountEntriesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountEntryDto: UpdateAccountEntryDto) {
    return this.accountEntriesService.update(+id, updateAccountEntryDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountEntriesService.remove(+id);
  }
}
