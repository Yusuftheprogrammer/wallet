import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from 'src/general/docreators/role.docreator';
import { UserRole } from './enums/roles.enum';
import { JwtGuard } from 'src/auth/passport/jwt.guard';
import { RolesGuard } from 'src/general/guards/guards.guard';

@Controller('users')
export class UsersController {
    constructor (private readonly usersService: UsersService) {}

    @UseGuards(JwtGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @Get()
    findAll() {
        return this.usersService.findAll();
    }


    @Post()
    create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto)
    }

    @Get(':publicId')
    findOne(@Param('publicId', ParseUUIDPipe) publicId: string) {
        return this.usersService.findOne(publicId);
    }

    @Patch(':publicId')
    update(@Param('publicId', ParseUUIDPipe) publicId, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.update(publicId, updateUserDto);
    }

    @Delete(':publicId')
    delete(@Param('publicId', ParseUUIDPipe) publicId) {
        return this.usersService.delete(publicId);   
    }

}
