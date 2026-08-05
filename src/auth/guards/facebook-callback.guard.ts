import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class FacebookCallbackGuard extends AuthGuard('facebook') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch (err: any) {
      context.switchToHttp().getRequest().oauthError =
        err?.message ?? 'Facebook authentication failed';
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
        err?.message ?? info?.message ?? 'Facebook authentication failed';
    }
    return user;
  }
}
