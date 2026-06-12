import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { WalletsService } from './wallets.service';
import type { Request } from 'express';
import { RolesGuard } from 'src/general/guards/guards.guard';
import { JwtGuard } from 'src/auth/passport/jwt.guard';
import { Roles } from 'src/general/docreators/role.docreator';
import { UserRole } from 'src/users/enums/roles.enum';
import { CreateWalletDto } from './dtos/create-wallet.dto';
import { UpdateWalletDto } from './dtos/update-wallet.dto';
import { SendMoneyDto } from './dtos/send-money.dto';
import { DepositMoneyDto } from './dtos/deposit-money.dto';
import { AdminCreateWalletDto } from './dtos/admin-create-wallet.dto';

@Controller('wallets')
export class WalletsController {
  constructor(private walletsService: WalletsService) {}

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @Get()
  findAll(@Req() req: Request) {
    return this.walletsService.findAll(req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @Get('transactions')
  findTransactions(@Req() req: Request) {
    return this.walletsService.findTransactions(req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @Get('transactions/:publicId')
  findTransaction(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Req() req: Request,
  ) {
    return this.walletsService.findTransaction(publicId, req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.USER)
  @Post()
  create(@Body() createWalletDto: CreateWalletDto, @Req() req: Request) {
    return this.walletsService.create(createWalletDto, req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin')
  adminCreate(@Body() body: AdminCreateWalletDto) {
    return this.walletsService.adminCreate(body, body.userId);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.USER, UserRole.ADMIN)
  @Get(':publicId')
  findOne(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Req() req: Request,
  ) {
    return this.walletsService.findOne(publicId, req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.USER)
  @Patch(':publicId')
  update(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @Req() req: Request,
  ) {
    return this.walletsService.update(publicId, updateWalletDto, req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.USER)
  @Delete(':publicId')
  delete(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Req() req: Request,
  ) {
    return this.walletsService.delete(publicId, req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.USER)
  @Post('exchange')
  send(@Body() sendMoneyDto: SendMoneyDto, @Req() req: Request) {
    return this.walletsService.sendMoney(sendMoneyDto, req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.USER)
  @Post('deposit')
  deposit(@Body() depositMoneyDto: DepositMoneyDto, @Req() req: Request) {
    return this.walletsService.deposit(depositMoneyDto, req);
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles(UserRole.USER)
  @Post('withdraw')
  withdraw(@Body() depositMoneyDto: DepositMoneyDto, @Req() req: Request) {
    return this.walletsService.withdraw(depositMoneyDto, req);
  }
}
