import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { AuthService } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.getOrThrow<string>('facebook.clientId'),
      clientSecret: configService.getOrThrow<string>('facebook.clientSecret'),
      callbackURL: configService.getOrThrow<string>('facebook.callbackUrl'),
      scope: ['email'],
      profileFields: ['id', 'displayName', 'emails'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: unknown, user?: unknown) => void,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(
        new BadRequestException(
          'Facebook account must grant email permission',
        ),
      );
    }

    const user = await this.authService.validateOAuthUser({
      provider: 'facebook',
      providerId: profile.id,
      email,
      fullName: profile.displayName,
    });

    done(null, user);
  }
}
