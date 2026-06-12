import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { Roles } from 'src/general/docreators/role.docreator';
import { UserRole } from './enums/roles.enum';
import { JwtGuard } from 'src/auth/passport/jwt.guard';
import { RolesGuard } from 'src/general/guards/guards.guard';
import type { Request } from 'express';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get()
    findAll() {
        return this.usersService.findAll();
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @UseGuards(JwtGuard)
    @Get(':publicId')
    findOne(
        @Param('publicId', ParseUUIDPipe) publicId: string,
        @Req() req: Request,
    ) {
        this.assertSelfOrAdmin(req, publicId);
        return this.usersService.findOne(publicId);
    }

    @UseGuards(JwtGuard)
    @Patch(':publicId')
    update(
        @Param('publicId', ParseUUIDPipe) publicId: string,
        @Body() updateUserDto: UpdateUserDto,
        @Req() req: Request,
    ) {
        this.assertSelfOrAdmin(req, publicId);
        return this.usersService.update(publicId, updateUserDto);
    }

    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Delete(':publicId')
    delete(@Param('publicId', ParseUUIDPipe) publicId: string) {
        return this.usersService.delete(publicId);
    }

    private assertSelfOrAdmin(req: Request, publicId: string) {
        const user = req.user as { publicId: string; role: UserRole };
        if (user.role !== UserRole.ADMIN && user.publicId !== publicId) {
            throw new ForbiddenException('You can only access your own profile');
        }
    }
}
