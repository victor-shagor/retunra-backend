import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err: any) {
      const req = context.switchToHttp().getRequest();
      if (!req.user) {
        req.oauthError = err?.message ?? 'Google authentication failed';
      }
      return true;
    }
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    // Only treat as failure when there is no user — a non-null err alongside
    // a valid user can occur in some OAuth flows and must not block login
    if (!user) {
      context.switchToHttp().getRequest().oauthError =
        err?.message ?? info?.message ?? 'Google authentication failed';
    }
    return user;
  }
}
