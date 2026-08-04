import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

export interface OAuthProfile {
  provider: 'google' | 'facebook';
  providerId: string;
  email: string;
  fullName: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  create(data: Pick<User, 'fullName' | 'phone' | 'email' | 'password'>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
    const idField = profile.provider === 'google' ? 'googleId' : 'facebookId';

    const existing = await this.usersRepository.findOne({
      where: { [idField]: profile.providerId },
    });
    if (existing) return existing;

    const byEmail = await this.usersRepository.findOne({
      where: { email: profile.email.toLowerCase() },
    });
    if (byEmail) {
      byEmail[idField] = profile.providerId;
      return this.usersRepository.save(byEmail);
    }

    const user = this.usersRepository.create({
      fullName: profile.fullName,
      email: profile.email.toLowerCase(),
      phone: null,
      password: null,
      googleId: profile.provider === 'google' ? profile.providerId : null,
      facebookId: profile.provider === 'facebook' ? profile.providerId : null,
    });
    return this.usersRepository.save(user);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.phone = :phone', { phone })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }
}
