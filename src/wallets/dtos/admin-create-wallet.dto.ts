import { IsUUID } from 'class-validator';
import { CreateWalletDto } from './create-wallet.dto';

export class AdminCreateWalletDto extends CreateWalletDto {
  @IsUUID()
  userId: string;
}
