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
import { AuthResponse, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { FacebookAuthGuard } from './guards/facebook-auth.guard';
import { FacebookCallbackGuard } from './guards/facebook-callback.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleCallbackGuard } from './guards/google-callback.guard';

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

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(GoogleCallbackGuard)
  async googleCallback(
    @Req() req: Request & { user: User; oauthError?: string },
    @Res() res: Response,
  ): Promise<void> {
    if (req.oauthError || !req.user) {
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
    if (req.oauthError || !req.user) {
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
