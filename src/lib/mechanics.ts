/**
 * 关卡机制 → 干员亲和表。
 *
 * 这是“关卡机制 × 个人 box”参谋闭环的核心映射：
 * 每种机制需求对应亲和的标签与职业，权重为启发式初始值，
 * 透明、可讨论、欢迎 PR 调整。真实关卡的机制标注待数据源接入后替换样例。
 */
import type { Profession } from './types';

export interface MechanicAffinity {
  /** 与该机制亲和的干员标签 */
  tags: string[];
  /** 与该机制亲和的职业（弱于标签命中） */
  professions: Profession[];
  /** 亲和加成权重（启发式，0–2） */
  weight: number;
}

export const MECHANIC_AFFINITY: Record<string, MechanicAffinity> = {
  需要法伤: { tags: ['法术伤害'], professions: ['术师'], weight: 1.2 },
  需要爆发: { tags: ['爆发'], professions: [], weight: 1.0 },
  需要群攻清杂: { tags: ['群攻'], professions: [], weight: 1.0 },
  需要治疗续航: { tags: ['治疗'], professions: ['医疗'], weight: 1.1 },
  需要高阻挡: { tags: ['防护'], professions: ['重装'], weight: 0.9 },
  需要费用周转: { tags: ['费用回复'], professions: ['先锋'], weight: 0.9 },
  需要控场: { tags: ['控场', '减速'], professions: ['辅助'], weight: 0.9 },
  需要生存: { tags: ['生存'], professions: [], weight: 0.8 },
};
