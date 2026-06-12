import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dtos/create-user.dto';
import { User } from './entities/user.entitiy';
import { Repository } from 'typeorm';
import { UpdateUserDto } from './dtos/update-user.dto';
import * as bcrypt from "bcrypt";
@Injectable()
export class UsersService {

    constructor (
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) {};

    findAll() {
        return this.usersRepository.find();
    }

    async findOne(publicId: string) {
        const user = await this.usersRepository.findOne({ where: { publicId } });
        if (!user) throw new NotFoundException();
        return user;
    }

    findByEmail(email: string) {
        return this.usersRepository.findOne({ 
            where: { email },
            select: {
                id: true,
                publicId: true,
                email: true,
                password: true,
                role: true
            } 
        });
    }

    async create (createUserDto: CreateUserDto) {
        try {
            const newUser = this.usersRepository.create(createUserDto);
            newUser.password = await bcrypt.hash(newUser.password, 10);
            await this.usersRepository.save(newUser);
            return { message: "User Created Successfully", success: true, user: newUser };
        } catch(err) {
            if (err.code === '23505') {
                throw new ConflictException('Email already exists!');
            }
            throw err;
        }
    }


    async update(publicId: string, body: UpdateUserDto) {

        const user = await this.usersRepository.findOne({ where: { publicId } });
        if (!user) throw new NotFoundException('User not found');

        const updatedUser = await this.usersRepository.save({ ...user, ...body });
        return { message: "User updated successfully", success: true, updatedUser }
    }

    async delete(publicId: string) {
        const user = await this.usersRepository.findOne({ where: { publicId } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        await this.usersRepository.delete({ publicId });
        return { message: 'User deleted successfully', success: true };
    }

}
