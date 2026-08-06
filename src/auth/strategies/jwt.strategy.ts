import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('jwt.secret'),
    });
  }

  async validate(payload: { sub: string }) {
    this.logger.debug(`Validating token for user id: ${payload.sub}`);
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      this.logger.warn(`User not found for id: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }
    this.logger.debug(`User found: ${user.email}`);
    return user;
  }
}
