import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { User } from '../users/entities/user.entity';
import { OAuthProfile, UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: {
    id: string;
    fullName: string;
    phone: string | null;
    email: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const [existingEmail, existingPhone] = await Promise.all([
      this.usersService.findByEmail(dto.email),
      this.usersService.findByPhone(dto.phone),
    ]);

    if (existingEmail) {
      throw new ConflictException('Email is already registered');
    }

    if (existingPhone) {
      throw new ConflictException('Phone number is already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      fullName: dto.fullName,
      phone: dto.phone,
      email: dto.email.toLowerCase(),
      password: hashedPassword,
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.findUserForLogin(dto);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user);
  }

  private async findUserForLogin(dto: LoginDto): Promise<User | null> {
    if (dto.email) {
      return this.usersService.findByEmail(dto.email.toLowerCase());
    }

    if (dto.phone) {
      return this.usersService.findByPhone(dto.phone);
    }

    return null;
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: { sub: string; jti: string };

    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const key = this.refreshTokenKey(payload.sub, payload.jti);
    const stored = await this.redisService.get(key);

    if (!stored) {
      throw new UnauthorizedException('Refresh token has been revoked or expired');
    }

    await this.redisService.del(key);
    return this.issueTokens(payload.sub);
  }

  async validateOAuthUser(profile: OAuthProfile): Promise<User> {
    return this.usersService.findOrCreateOAuthUser(profile);
  }

  async loginWithUser(user: User): Promise<AuthResponse> {
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User): Promise<AuthResponse> {
    const tokens = await this.issueTokens(user.id);

    return {
      ...tokens,
      user: {
        id: user.id,
        fullName: user.fullName,
        phone: user.phone,
        email: user.email,
      },
    };
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const refreshTokenId = randomUUID();
    const payload = { sub: userId };

    const jwtSecret = this.configService.getOrThrow<string>('jwt.secret');
    const accessExpiresIn = this.configService.getOrThrow<number>(
      'jwt.accessExpiresInSeconds',
    );
    const refreshExpiresIn = this.configService.getOrThrow<number>(
      'jwt.refreshExpiresInSeconds',
    );

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: jwtSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(
        { ...payload, jti: refreshTokenId },
        {
          secret: jwtSecret,
          expiresIn: refreshExpiresIn,
        },
      ),
    ]);

    await this.redisService.set(
      this.refreshTokenKey(userId, refreshTokenId),
      '1',
      this.configService.getOrThrow<number>('jwt.refreshExpiresInSeconds'),
    );

    return { accessToken, refreshToken };
  }

  private refreshTokenKey(userId: string, tokenId: string): string {
    return `refresh_token:${userId}:${tokenId}`;
  }
}
