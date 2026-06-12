import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from 'src/users/enums/roles.enum';
import { ROLES_KEY } from '../docreators/role.docreator';

@Injectable()
export class RolesGuard implements CanActivate {

  constructor (private reflector: Reflector) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {

    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();

    if (!(requiredRoles.includes(request.user.role))) {
      return false
    }

    return true;
  }
}
