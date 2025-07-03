import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/user/entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import { getRateLimitConfig } from '../config/rate-limit.config';
import { ChatRateLimit } from '../entities/chat-rate-limit.entity';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  isWarning: boolean;
  blockReason?: string;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    @InjectRepository(ChatRateLimit)
    private readonly rateLimitRepository: Repository<ChatRateLimit>,
  ) {}

  async checkRateLimit(user: User): Promise<RateLimitResult> {
    const config = getRateLimitConfig(user.role.code);
    const now = new Date();
    const windowStart = this.getWindowStart(now);

    await this.cleanupOldRecords();

    let rateLimitRecord = await this.rateLimitRepository.findOne({
      where: {
        user: { id: user.id },
        windowStart,
      },
    });

    if (!rateLimitRecord) {
      rateLimitRecord = this.rateLimitRepository.create({
        user,
        windowStart,
        requestCount: 0,
        isBlocked: false,
      });
      await this.rateLimitRepository.save(rateLimitRecord);
    }

    if (rateLimitRecord.isBlocked && rateLimitRecord.blockedUntil) {
      if (now < rateLimitRecord.blockedUntil) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: rateLimitRecord.blockedUntil,
          isWarning: false,
          blockReason: `Bloqueado hasta ${rateLimitRecord.blockedUntil.toLocaleTimeString()}`,
        };
      } else {
        rateLimitRecord.isBlocked = false;
        rateLimitRecord.blockedUntil = null;
        rateLimitRecord.requestCount = 0;
      }
    }

    if (rateLimitRecord.requestCount >= config.maxRequestsPerHour) {
      const blockUntil = new Date(
        now.getTime() + config.blockDurationMinutes * 60 * 1000,
      );
      rateLimitRecord.isBlocked = true;
      rateLimitRecord.blockedUntil = blockUntil;

      await this.rateLimitRepository.save(rateLimitRecord);

      return {
        allowed: false,
        remaining: 0,
        resetTime: blockUntil,
        isWarning: false,
        blockReason: `Límite excedido. Bloqueado hasta ${blockUntil.toLocaleTimeString()}`,
      };
    }

    const remaining = config.maxRequestsPerHour - rateLimitRecord.requestCount;
    const usagePercentage =
      (rateLimitRecord.requestCount / config.maxRequestsPerHour) * 100;
    const isWarning = usagePercentage >= config.warningThreshold;

    const resetTime = new Date(windowStart.getTime() + 60 * 60 * 1000);

    return {
      allowed: true,
      remaining,
      resetTime,
      isWarning,
    };
  }

  async incrementCounter(user: User): Promise<void> {
    const windowStart = this.getWindowStart(new Date());

    let rateLimitRecord = await this.rateLimitRepository.findOne({
      where: {
        user: { id: user.id },
        windowStart,
      },
    });

    if (rateLimitRecord) {
      rateLimitRecord.requestCount += 1;
      await this.rateLimitRepository.save(rateLimitRecord);
    } else {
      rateLimitRecord = this.rateLimitRepository.create({
        user,
        windowStart,
        requestCount: 1,
        isBlocked: false,
      });
      await this.rateLimitRepository.save(rateLimitRecord);
    }
  }

  async getRateLimitStatus(user: User): Promise<{
    current: number;
    limit: number;
    remaining: number;
    resetTime: Date;
    isBlocked: boolean;
  }> {
    const config = getRateLimitConfig(user.role.code);
    const windowStart = this.getWindowStart(new Date());

    const rateLimitRecord = await this.rateLimitRepository.findOne({
      where: {
        user: { id: user.id },
        windowStart,
      },
    });

    const current = rateLimitRecord?.requestCount || 0;
    const remaining = Math.max(0, config.maxRequestsPerHour - current);
    const resetTime = new Date(windowStart.getTime() + 60 * 60 * 1000);

    return {
      current,
      limit: config.maxRequestsPerHour,
      remaining,
      resetTime,
      isBlocked: rateLimitRecord?.isBlocked || false,
    };
  }

  private getWindowStart(date: Date): Date {
    const windowStart = new Date(date);
    windowStart.setMinutes(0, 0, 0);
    return windowStart;
  }

  private async cleanupOldRecords(): Promise<void> {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      await this.rateLimitRepository.delete({
        windowStart: LessThan(twentyFourHoursAgo),
      });
    } catch (error) {
      this.logger.error(
        `Error cleaning up old rate limit records: ${error.message}`,
      );
    }
  }
}
