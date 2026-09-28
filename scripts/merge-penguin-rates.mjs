/**
 * 企鹅物流真实掉率合并脚本（**尚未启用** —— 等待书面数据条款确认）。
 *
 * 用途：把企鹅物流统计的每关每材料期望产出合并进 real-stages.json 的 expectPerRun，
 * 使刷图规划（次数/理智估算）在真实数据集下完整工作。
 *
 * ⚠️ 诚实门闩：截至 2026-09-27，企鹅物流的 API 与数据**没有书面使用条款**
 * （代码 MIT 已核实，数据条款缺失；侦察记录见 NOTICE.md）。本项目约定：
 * 接入前必须先取得权利方书面许可/条款。因此本脚本默认拒绝运行，
 * 只有当你确认已获得条款许可时，显式传入 --confirm-terms 才会执行。
 *
 * 数据获取（确认条款后）：
 *   curl -sS "https://penguin-stats.io/PenguinStats/api/v2/result/matrix?server=CN" -o penguin-matrix.json
 *
 * 端点结构（2026-09-27 实测）：{ matrix: [{ stageId, itemId, times, quantity, stdDev, ... }] }
 * 期望产出 = quantity / times；randomMaterial_N 等非真实材料 id 的行不参与合并。
 *
 * 运行：node scripts/merge-penguin-rates.mjs --matrix <penguin-matrix.json 路径> --confirm-terms
 * 注意：合并后 tests/data.test.ts 中「真实掉率如实为 0」的锁定断言会失败 —— 这是有意的：
 * 请同步把该断言改为抽查若干已知期望值（ Penguin 的数据是统计值，允许小数与随版本波动）。
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
if (!args.includes('--confirm-terms')) {
  console.error(
    '拒绝运行：企鹅物流尚无书面数据条款（见 NOTICE.md）。\n' +
      '取得许可后，请带上 --confirm-terms 重新运行。',
  );
  process.exit(1);
}
const matrixIdx = args.indexOf('--matrix');
if (matrixIdx < 0) {
  console.error('用法：node scripts/merge-penguin-rates.mjs --matrix <文件> --confirm-terms');
  process.exit(1);
}

const matrix = JSON.parse(fs.readFileSync(args[matrixIdx + 1], 'utf8')).matrix ?? [];
const stagesFile = path.resolve(import.meta.dirname, '../src/data/real-stages.json');
const doc = JSON.parse(fs.readFileSync(stagesFile, 'utf8'));

const rates = new Map();
for (const row of matrix) {
  if (typeof row.itemId !== 'string' || !/^(?:300|310|324|325|326|4001)/.test(row.itemId)) continue;
  if (!row.times || row.times <= 0) continue;
  rates.set(`${row.stageId}::${row.itemId}`, row.quantity / row.times);
}

let merged = 0;
let missing = 0;
for (const stage of doc.stages) {
  for (const drop of stage.drops) {
    const rate = rates.get(`${stage.id}::${drop.materialId}`);
    if (rate === undefined) {
      missing += 1;
      continue;
    }
    drop.expectPerRun = Math.round(rate * 10000) / 10000;
    merged += 1;
  }
}

doc._meta = {
  ...doc._meta,
  penguinRatesMergedAt: new Date().toISOString().slice(0, 10),
  penguinSource: 'https://penguin-stats.io/PenguinStats/api/v2/result/matrix?server=CN（统计值，随上传波动）',
};

fs.writeFileSync(stagesFile, JSON.stringify(doc, null, 2) + '\n');
console.log(`已合并 ${merged} 条期望产出；${missing} 条在企鹅矩阵中无对应数据（保留 0）。\n别忘了同步更新 tests/data.test.ts 的掉率锁定断言。`);
