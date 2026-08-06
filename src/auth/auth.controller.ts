import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { User } from '../users/entities/user.entity';
import { AuthResponse, AuthService, AuthTokens } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { FacebookCallbackGuard } from './guards/facebook-callback.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleCallbackGuard } from './guards/google-callback.guard';

@Public()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<AuthResponse> {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto): Promise<AuthTokens> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleCallback(
    @Req() req: Request & { user: User; oauthError?: string },
    @Res() res: Response,
  ): Promise<void> {
    if (!req.user) {
      return res.redirect(this.buildErrorUrl(req.oauthError));
    }
    const authResponse = await this.authService.loginWithUser(req.user);
    res.redirect(this.buildCallbackUrl(authResponse));
  }

  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  facebookLogin(): void {}

  @Get('facebook/callback')
  @UseGuards(FacebookCallbackGuard)
  async facebookCallback(
    @Req() req: Request & { user: User; oauthError?: string },
    @Res() res: Response,
  ): Promise<void> {
    if (!req.user) {
      return res.redirect(this.buildErrorUrl(req.oauthError));
    }
    const authResponse = await this.authService.loginWithUser(req.user);
    res.redirect(this.buildCallbackUrl(authResponse));
  }

  private buildCallbackUrl(authResponse: AuthResponse): string {
    const frontendUrl = this.configService.getOrThrow<string>('frontend.url');
    const params = new URLSearchParams({
      accessToken: authResponse.accessToken,
      refreshToken: authResponse.refreshToken,
      id: authResponse.user.id,
      fullName: authResponse.user.fullName,
      email: authResponse.user.email ?? '',
    });
    return `${frontendUrl}/auth/callback?${params.toString()}`;
  }

  private buildErrorUrl(message?: string): string {
    const frontendUrl = this.configService.getOrThrow<string>('frontend.url');
    const params = new URLSearchParams({ error: 'oauth_failed' });
    if (message) params.set('reason', message);
    return `${frontendUrl}/login?${params.toString()}`;
  }
}
