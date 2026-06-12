import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from "bcrypt";
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

    constructor (
        private usersService: UsersService,
        private jwtService: JwtService,
    ) {}

    async login (loginDto: LoginDto) {
        const user = await this.usersService.findByEmail(loginDto.email);

        if (!user) {
            await bcrypt.compare('dummy', '$2b$10$dummyhashstringfortimingattack');
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPassValid = await bcrypt.compare(loginDto.password, user.password);

        if (!isPassValid) throw new UnauthorizedException('Invalid credentials');

        const token = await this.jwtService.signAsync({
            sub: user.publicId,
            role: user.role
        });


        return { 
            message: "Logged in successfully",
            success: true,
            access_token: token
        }

    }

    async profile(req) {
        const user = await this.usersService.findOne(req.user.publicId);
        return user;
    }

}
