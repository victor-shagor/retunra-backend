import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err: any) {
      context.switchToHttp().getRequest().oauthError =
        err?.message ?? 'Google authentication failed';
      return true;
    }
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      context.switchToHttp().getRequest().oauthError =
        err?.message ?? info?.message ?? 'Google authentication failed';
    }
    return user;
  }
}
