import { Body, Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { LoginDto } from './dtos/login.dto';
import { AuthService } from './auth.service';
import { JwtGuard } from './passport/jwt.guard';

@Controller('auth')
export class AuthController {

    constructor ( 
        private authService: AuthService
    ) {}

    @Post('/login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @UseGuards(JwtGuard)
    @Get('/profile')
    profile(@Request() req) {
        return this.authService.profile(req);
    }

}
