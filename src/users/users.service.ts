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
    const firstName = data.fullName.split(' ')[0];
    const user = this.usersRepository.create({ ...data, storeName: `${firstName}'s Closet` });
    return this.usersRepository.save(user);
  }

  async findOrCreateOAuthUser(profile: OAuthProfile): Promise<User> {
    const idField = profile.provider === 'google' ? 'googleId' : 'facebookId';
    const email = profile.email.toLowerCase().trim();

    const existing = await this.usersRepository.findOne({
      where: { [idField]: profile.providerId },
    });
    if (existing) return existing;

    const byEmail = await this.usersRepository.findOne({ where: { email } });
    if (byEmail) {
      byEmail[idField] = profile.providerId;
      return this.usersRepository.save(byEmail);
    }

    try {
      const firstName = profile.fullName.split(' ')[0];
      const user = this.usersRepository.create({
        fullName: profile.fullName,
        email,
        phone: null,
        password: null,
        storeName: `${firstName}'s Closet`,
        googleId: profile.provider === 'google' ? profile.providerId : null,
        facebookId: profile.provider === 'facebook' ? profile.providerId : null,
      });
      return await this.usersRepository.save(user);
    } catch (err: any) {
      // Race condition or email normalisation mismatch — link to the existing account
      if (err?.code === '23505' && err?.constraint === 'UQ_users_email') {
        const linked = await this.usersRepository.findOne({ where: { email } });
        if (linked) {
          linked[idField] = profile.providerId;
          return this.usersRepository.save(linked);
        }
      }
      throw err;
    }
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
