import { IsEmail, IsEnum, IsNotEmpty, IsString } from "class-validator";
import { UserRole } from "../enums/roles.enum";


export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;


    @IsEmail()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;


    @IsEnum(UserRole)
    role: UserRole;

}