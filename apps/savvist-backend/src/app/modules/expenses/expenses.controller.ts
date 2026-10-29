import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CurrentUser } from '../../common/current-user/current-user.decorator';
import { CurrentUserGuard } from '../../common/current-user/current-user.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { UserDocument } from '../users/schemas/user.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@UseGuards(CurrentUserGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(
    @Inject(ExpensesService)
    private readonly expensesService: ExpensesService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: UserDocument,
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    return this.expensesService.create(user._id, createExpenseDto);
  }

  @Get()
  findAll(@CurrentUser() user: UserDocument) {
    return this.expensesService.findAll(user._id);
  }

  @Get('total')
  getTotal(
    @CurrentUser() user: UserDocument,
    @Query('month') month?: string,
  ) {
    const monthNum = month ? parseInt(month, 10) : undefined;
    return this.expensesService.getTotal(user._id, monthNum);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.expensesService.findOne(user._id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
    @Body() updateExpenseDto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(user._id, id, updateExpenseDto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: UserDocument,
    @Param('id', ParseObjectIdPipe) id: Types.ObjectId,
  ) {
    return this.expensesService.remove(user._id, id);
  }
}
