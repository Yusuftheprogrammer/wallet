import { Type } from 'class-transformer';
import {
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SendMoneyDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey: string;

  @IsUUID()
  receiverWalletId: string;

  @IsUUID()
  senderWalletId: string;
}
