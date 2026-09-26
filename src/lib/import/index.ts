/**
 * 导入适配器注册表。
 *
 * 干员 box 数据入口：
 * - generic：宽容解析的通用 JSON（本文件 generic.ts）；
 * - maa：MAA 干员识别导出的严格解析（maa.ts）——格式已对照官方发布源码
 *   （tag v6.18.0）核实，依据与行号登记在 NOTICE.md；
 * - sample：一键载入内置示例（在导入面板中提供）。
 */
import type { OperBoxEntry } from '../types';
import { parseOperBoxJson, type ParseResult } from './generic';
import { parseMaaOperBoxJson } from './maa';

export type AdapterStatus = 'available' | 'todo';

export interface ImportAdapter {
  id: string;
  label: string;
  status: AdapterStatus;
  /** status === 'todo' 时向用户展示的说明 */
  note?: string;
  parse?: (text: string) => ParseResult<OperBoxEntry[]>;
}

export const OPER_BOX_ADAPTERS: ImportAdapter[] = [
  {
    id: 'generic',
    label: '通用 JSON（宽容解析）',
    status: 'available',
    parse: parseOperBoxJson,
  },
  {
    id: 'maa',
    label: 'MAA 干员识别导出',
    status: 'available',
    parse: parseMaaOperBoxJson,
  },
];
