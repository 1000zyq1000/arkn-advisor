/**
 * 真实数据集生成脚本：把游戏数据仓库的原始 JSON 转换为本项目的 Dataset 数据文件。
 *
 * 数据来源与核实方式（详见 NOTICE.md）：
 * - 仓库 Kengxxiao/ArknightsGameData（master 分支，社区维护的游戏数据提取，无许可声明，
 *   数据版权归上海鹰角网络科技有限公司 / Yostar，本项目仅作社区工具用途的引用）；
 * - 下载后逐文件以 git hash-object 与 GitHub blob SHA 对账（清单见 --from 目录的 manifest 文件）；
 * - 本脚本只做结构转换与过滤，不修改、不虚构任何数值。
 *
 * 用法：node scripts/build-real-dataset.mjs --from <包含 agd-*.json 与 agd-manifest.json 的目录>
 * 产出：src/data/real-materials.json / real-operators.json / real-operator-costs.json / real-stages.json
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const fromIdx = args.indexOf('--from');
const fromDir = fromIdx >= 0 ? args[fromIdx + 1] : '.';
const outDir = path.resolve(import.meta.dirname, '../src/data');

const read = (f) => JSON.parse(fs.readFileSync(path.join(fromDir, f), 'utf8'));
const manifest = read('agd-manifest.json');
const ct = read('agd-character_table.json');
const it = read('agd-item_table.json');
const bd = read('agd-building_data.json');
const st = read('agd-stage_table.json');

const baseMeta = () => ({
  source: 'GAME_DATA',
  sourceRepo: manifest.source,
  sourceBranch: manifest.sourceBranch,
  sourceBlobs: manifest.blobs,
  fetchedAt: manifest.fetchedAt,
  generatedAt: new Date().toISOString().slice(0, 10),
  extraction: manifest.verification,
});

const PROFESSION_ZH = {
  PIONEER: '先锋',
  WARRIOR: '近卫',
  TANK: '重装',
  SNIPER: '狙击',
  CASTER: '术师',
  MEDIC: '医疗',
  SUPPORT: '辅助',
  SPECIAL: '特种',
};
const PLAYABLE = new Set(Object.keys(PROFESSION_ZH));
const tierOf = (rarity) => Number(String(rarity).replace('TIER_', '')) || 0;

// ---------- 材料 ----------
// 第一遍：classifyType === MATERIAL 的全部条目 + 龙门币（MAA 库存导入常见键）。
// 第二遍：把保留关卡的掉落物（碳素/采购凭证等 NORMAL 类物品）并入材料全集，
//         使资源关的掉落引用完整；作战记录（CARD_EXP，经验）不建模，继续排除。
const materials = [];
const materialIds = new Set();
for (const [id, item] of Object.entries(it.items)) {
  if (item.classifyType !== 'MATERIAL' && id !== '4001') continue;
  const tier = tierOf(item.rarity);
  if (tier <= 0) continue;
  materials.push({ id, name: item.name, tier });
  materialIds.add(id);
}
const stageDropIds = new Set();
for (const s of Object.values(st.stages)) {
  const isMain = s.stageType === 'MAIN';
  const isResource = /^(LS|CE|SK|AP|PR)-/.test(s.code ?? '');
  if (!isMain && !isResource) continue;
  const rewards = [
    ...(s.stageDropInfo?.displayRewards ?? []),
    ...(s.stageDropInfo?.displayDetailRewards ?? []),
  ];
  for (const r of rewards) {
    // 龙门币在掉落中的类型标记是 GOLD
    if ((r.type !== 'MATERIAL' && r.id !== '4001') || r.dropType !== 'NORMAL') continue;
    stageDropIds.add(r.id);
  }
}
for (const id of stageDropIds) {
  if (materialIds.has(id)) continue;
  const item = it.items[id];
  if (!item) continue;
  const tier = tierOf(item.rarity);
  if (tier <= 0) continue;
  materials.push({ id, name: item.name, tier });
  materialIds.add(id);
}
// 真实合成配方：制造站 F_EVOLVE 配方（产出 = itemId，inputs = costs）
let craftCount = 0;
for (const formula of Object.values(bd.workshopFormulas)) {
  if (formula.formulaType !== 'F_EVOLVE') continue;
  if (!materialIds.has(formula.itemId)) continue;
  const inputs = (formula.costs ?? [])
    .filter((c) => materialIds.has(c.id))
    .map((c) => ({ materialId: c.id, count: c.count }));
  if (inputs.length === 0 || inputs.length !== (formula.costs ?? []).length) continue;
  const mat = materials.find((m) => m.id === formula.itemId);
  mat.craft = { inputs };
  craftCount += 1;
}
// 按材料等级降序校验配方引用（tier 更低），不满足则丢弃该配方（数据异常防御）
for (const mat of materials) {
  if (!mat.craft) continue;
  const bad = mat.craft.inputs.some((i) => {
    const low = materials.find((m) => m.id === i.materialId);
    return !low || low.tier >= mat.tier;
  });
  if (bad) {
    console.warn(`配方异常已丢弃：${mat.id} ${mat.name}`);
    delete mat.craft;
    craftCount -= 1;
  }
}

// ---------- 干员 ----------
// 范围：八大职业、可获取、TIER_1..6；同名字段（如阿米娅的多形态）仅保留 id 最小的基础形态。
const byName = new Map();
let skippedNotObtainable = 0;
for (const [id, c] of Object.entries(ct)) {
  if (!PLAYABLE.has(c.profession)) continue;
  const rarity = tierOf(c.rarity);
  if (rarity < 1 || rarity > 6) continue;
  if (c.isNotObtainable) {
    skippedNotObtainable += 1;
    continue;
  }
  const op = {
    id,
    name: c.name,
    rarity,
    profession: PROFESSION_ZH[c.profession],
    tags: Array.isArray(c.tagList) ? c.tagList : [],
  };
  const prev = byName.get(c.name);
  if (!prev || id < prev.id) byName.set(c.name, op);
}
const operators = [...byName.values()]
  .sort((a, b) => a.id.localeCompare(b.id))
  .map((o) => ({ name: o.name, rarity: o.rarity, profession: o.profession, tags: o.tags }));
const operatorIds = new Set([...byName.values()].map((o) => o.id));

// ---------- 精英化消耗（按干员）----------
const costs = {};
let costMissingPhase = 0;
for (const [id, c] of Object.entries(ct)) {
  if (!operatorIds.has(id)) continue;
  const name = c.name;
  const phaseCost = (i) =>
    (c.phases?.[i]?.evolveCost ?? [])
      .filter((e) => materialIds.has(e.id))
      .map((e) => ({ materialId: e.id, count: e.count }));
  const phase1 = phaseCost(1);
  const phase2 = phaseCost(2);
  const expected = (c.phases?.length ?? 0) >= 2 ? 1 : 0;
  if (expected && phase1.length === 0) costMissingPhase += 1;
  costs[name] = { phase1, phase2 };
}
if (costMissingPhase > 0) console.warn(`有 ${costMissingPhase} 名干员的精英化消耗为空`);

// 消耗引用但不在材料集中的条目（防御：并入材料表）
for (const { phase1, phase2 } of Object.values(costs)) {
  for (const mc of [...phase1, ...phase2]) {
    if (!materialIds.has(mc.materialId)) {
      const item = it.items[mc.materialId];
      if (item) {
        materials.push({ id: mc.materialId, name: item.name, tier: tierOf(item.rarity) });
        materialIds.add(mc.materialId);
      }
    }
  }
}

// ---------- 关卡 ----------
// 范围：主线 + 常驻资源关（LS/CE/SK/AP/PR 芯片），掉落取 stageDropInfo 中 type=MATERIAL 且
// dropType=NORMAL 的物品。期望产出（掉率）不在游戏数据中，置 0 —— 待企鹅物流等来源接入。
const stages = [];
const stageSeen = new Set();
for (const s of Object.values(st.stages)) {
  const isMain = s.stageType === 'MAIN';
  const isResource = /^(LS|CE|SK|AP|PR)-/.test(s.code ?? '');
  if (!isMain && !isResource) continue;
  if (!s.code || !s.apCost || s.sanityGuard) continue;
  if (stageSeen.has(s.code)) continue;
  stageSeen.add(s.code);
  const dropIds = new Set();
  const rewards = [
    ...(s.stageDropInfo?.displayRewards ?? []),
    ...(s.stageDropInfo?.displayDetailRewards ?? []),
  ];
  for (const r of rewards) {
    if (r.dropType !== 'NORMAL') continue;
    // 龙门币在掉落中的类型标记是 GOLD
    if (r.type !== 'MATERIAL' && r.id !== '4001') continue;
    if (!materialIds.has(r.id)) continue;
    dropIds.add(r.id);
  }
  if (dropIds.size === 0) continue;
  stages.push({
    id: s.stageId,
    code: s.code,
    name: s.name,
    sanity: s.apCost,
    drops: [...dropIds].sort().map((materialId) => ({ materialId, expectPerRun: 0 })),
  });
}
stages.sort((a, b) => a.id.localeCompare(b.id));

// ---------- 写文件 ----------
const noteTail =
  '全部数值直接转换自游戏数据提取（未修改、未虚构）；' +
  '期望掉率不在游戏数据中（置 0），刷取规划待企鹅物流等真实掉率来源接入后启用；' +
  '干员精英化消耗不含龙门币（游戏数据该版本未随 phases 提供）。' +
  '同名的多形态干员（如阿米娅的多形态）仅保留基础形态。';

const write = (file, meta, payload) => {
  fs.writeFileSync(path.join(outDir, file), JSON.stringify({ _meta: meta, ...payload }, null, 2) + '\n');
  console.log(`写出 ${file}`);
};

write('real-materials.json', { ...baseMeta(), note: '真实材料与合成配方。' + noteTail }, {
  materials: materials.sort((a, b) => a.id.localeCompare(b.id)),
});
write('real-operators.json', { ...baseMeta(), note: '真实干员名单（名称/稀有度/职业/公招标签）。' + noteTail }, {
  operators,
});
write('real-operator-costs.json', { ...baseMeta(), note: '真实精英化消耗（按干员，phase1/phase2）。' + noteTail }, {
  costs,
});
write('real-stages.json', { ...baseMeta(), note: '真实主线与常驻资源关（理智/掉落物列表）。' + noteTail }, {
  stages,
});

// ---------- 挑战型关卡（绝境作战）机制推导 ----------
// 「关卡机制需求」不在游戏数据中，无法直接提取。这里采用**数据驱动的启发式标注**：
// 从关卡波次的实际出怪与敌人基础数值（enemy_database level '0'）推导，
// 规则与阈值如下（透明、可讨论；这是编辑性标注，非官方数据）：
//   需要法伤   = 高防敌人（def≥500 且 def≥2×抗性）占比 ≥15%
//   需要爆发   = 高血敌人（hp≥18000）数量 ≥2
//   需要群攻清杂 = 出怪总数 ≥55
//   需要高阻挡 = 重甲敌人（hp≥6000 且 def≥200 且 速度≤1.0）占比 ≥20%
//   需要控场   = 快速高攻敌人（速度≥1.2 且 攻击≥500）占比 ≥12%
//   需要治疗续航 = 高攻敌人（攻击≥800）占比 ≥20%
const db = JSON.parse(fs.readFileSync(path.join(fromDir, 'agd-enemy_database.json'), 'utf8'));
const enemyStats = new Map();
for (const it of db.enemies) {
  const variants = it.Value ?? {};
  const base = variants['0'] ?? Object.values(variants)[0];
  if (!base?.enemyData?.attributes) continue;
  const a = base.enemyData.attributes;
  const m = (x) => (x && typeof x === 'object' && x.m_defined !== false ? x.m_value : undefined);
  enemyStats.set(it.Key, {
    hp: m(a.maxHp),
    atk: m(a.atk),
    def: m(a.def),
    res: m(a.magicResistance),
    spd: m(a.moveSpeed),
  });
}

function stageEnemies(levelRelPath) {
  const lv = JSON.parse(
    fs.readFileSync(path.join(fromDir, 'levels', path.basename(levelRelPath)), 'utf8'),
  );
  const counts = new Map();
  const add = (key, n) => {
    if (!/^enemy_/.test(key ?? '')) return;
    counts.set(key, (counts.get(key) ?? 0) + n);
  };
  for (const w of lv.waves ?? []) {
    for (const frag of w.fragments ?? []) {
      for (const a of frag.actions ?? []) {
        if (a.actionType === 'SPAWN' || a.actionType === 'SPAWN_ENEMIES') add(a.key, a.count ?? 1);
      }
    }
  }
  for (const pre of [lv.predefines, lv.hardPredefines]) {
    for (const inst of pre?.enemyInsts ?? []) add(inst.id, 1);
  }
  return counts;
}

const challengeStages = [];
const hStages = Object.values(st.stages).filter((s) => /^H\d/.test(s.code ?? ''));
for (const s of hStages) {
  let counts;
  try {
    counts = stageEnemies(s.levelId.replace('Obt/Hard', 'obt/hard') + '.json');
  } catch {
    console.warn(`关卡文件缺失，跳过 ${s.code}`);
    continue;
  }
  let total = 0;
  const agg = { armored: 0, burst: 0, chunky: 0, fast: 0, pressure: 0 };
  for (const [id, n] of counts) {
    const v = enemyStats.get(id);
    total += n;
    if (!v || v.hp === undefined) continue;
    if (v.def >= 500 && v.def >= 2 * (v.res ?? 0)) agg.armored += n;
    if (v.hp >= 18000) agg.burst += n;
    if (v.hp >= 6000 && v.def >= 200 && (v.spd ?? 1) <= 1.0) agg.chunky += n;
    if ((v.spd ?? 0) >= 1.2 && (v.atk ?? 0) >= 500) agg.fast += n;
    if ((v.atk ?? 0) >= 800) agg.pressure += n;
  }
  const share = (n) => (total ? n / total : 0);
  const mechanics = [];
  if (share(agg.armored) >= 0.15) mechanics.push('需要法伤');
  if (agg.burst >= 2) mechanics.push('需要爆发');
  if (total >= 55) mechanics.push('需要群攻清杂');
  if (share(agg.chunky) >= 0.2) mechanics.push('需要高阻挡');
  if (share(agg.fast) >= 0.12) mechanics.push('需要控场');
  if (share(agg.pressure) >= 0.2) mechanics.push('需要治疗续航');
  if (mechanics.length === 0) continue;
  challengeStages.push({ id: s.stageId, code: s.code, name: s.name, mechanics });
}
challengeStages.sort((a, b) => a.id.localeCompare(b.id));

write('real-challenge-stages.json', {
  ...baseMeta(),
  note:
    '绝境作战关卡的机制需求为**本项目由敌人数值启发式推导**（规则与阈值见生成脚本头部注释；' +
    `敌人数值来源 enemy_database，blob SHA ${manifest.blobs['enemy_database.json'].slice(0, 10)}…）。` +
    '这是编辑性标注而非官方数据，仅供推荐引擎的亲和加成参考。',
}, {
  challengeStages,
});
console.log(`挑战关卡（启发式推导）= ${challengeStages.length}/${hStages.length}`);

console.log(`统计：材料 ${materials.length}（含配方 ${craftCount}）| 干员 ${operators.length}（另有 ${skippedNotObtainable} 条不可获取条目被排除）| 消耗条目 ${Object.keys(costs).length} | 关卡 ${stages.length}`);
