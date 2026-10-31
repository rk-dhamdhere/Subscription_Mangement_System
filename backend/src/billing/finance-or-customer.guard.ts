import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role, StaffRole } from '../generated/prisma/client';

@Injectable()
export class FinanceOrCustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { role: Role; staffRole: StaffRole };
    }>();
    const user = request.user;
    if (
      user?.role === Role.ADMIN ||
      user?.role === Role.CUSTOMER ||
      (user?.role === Role.STAFF && user.staffRole === StaffRole.FINANCE)
    ) {
      return true;
    }
    throw new ForbiddenException(
      'access is restricted to Admin, Finance, and the customer',
    );
  }
}
