import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';
import { UsersService } from 'src/users/users.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { generateOpaqueToken, hashToken } from 'src/common/utils/hash-token';
import { parseDuration } from 'src/common/utils/parse-duration';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user) {
      await bcrypt.compare(
        'dummy',
        '$2b$10$dummyhashstringfortimingattack',
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPassValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPassValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokenPair(user.publicId, user.role);

    return {
      message: 'Logged in successfully',
      success: true,
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash,
        revokedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      relations: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    stored.revokedAt = new Date();
    await this.refreshTokenRepository.save(stored);

    const user = await this.usersService.findOne(stored.user.publicId);
    const tokens = await this.issueTokenPair(user.publicId, user.role);

    return {
      message: 'Token refreshed successfully',
      success: true,
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash, revokedAt: IsNull() },
    });

    if (stored) {
      stored.revokedAt = new Date();
      await this.refreshTokenRepository.save(stored);
    }

    return {
      message: 'Logged out successfully',
      success: true,
    };
  }

  async profile(req) {
    const user = await this.usersService.findOne(req.user.publicId);
    return user;
  }

  private async issueTokenPair(userId: string, role: string) {
    const access_token = await this.jwtService.signAsync({
      sub: userId,
      role,
    });

    const refresh_token = generateOpaqueToken();
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    const expiresAt = new Date(
      Date.now() + parseDuration(refreshExpiresIn),
    );

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        tokenHash: hashToken(refresh_token),
        user: { publicId: userId },
        expiresAt,
      }),
    );

    return { access_token, refresh_token };
  }
}
