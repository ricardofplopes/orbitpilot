import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TSHIRT_MAP: Record<string, number> = {
  XS: 1,
  S: 3,
  M: 5,
  L: 8,
  XL: 13,
  XXL: 21,
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Get the t-shirt size → story-points map (with defaults if not configured) */
  async getTShirtMap(): Promise<Record<string, number>> {
    const config = await this.prisma.integrationConfig.findFirst({ where: { type: 'app' } });
    const cfg = (config?.config as any) || {};
    const map = cfg.tShirtSizeMap || {};
    return { ...DEFAULT_TSHIRT_MAP, ...map };
  }

  /** Update the t-shirt size → story-points map */
  async updateTShirtMap(map: Record<string, number>): Promise<Record<string, number>> {
    const clean: Record<string, number> = {};
    for (const [k, v] of Object.entries(map)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) {
        clean[k.trim().toUpperCase()] = n;
      }
    }

    const existing = await this.prisma.integrationConfig.findFirst({ where: { type: 'app' } });
    const newCfg = {
      ...((existing?.config as any) || {}),
      tShirtSizeMap: clean,
    };

    if (existing) {
      await this.prisma.integrationConfig.update({
        where: { id: existing.id },
        data: { config: newCfg as any },
      });
    } else {
      await this.prisma.integrationConfig.create({
        data: { type: 'app', config: newCfg as any, isActive: true },
      });
    }

    return this.getTShirtMap();
  }
}
