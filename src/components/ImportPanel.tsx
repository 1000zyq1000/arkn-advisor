/** 导入页：干员 box（JSON 导入 + 手动编辑）与材料库存。 */
import { useState } from 'react';
import type { Depot, Elite, OperBoxEntry } from '../lib/types';
import { OPER_BOX_ADAPTERS } from '../lib/import';
import { parseDepotJson } from '../lib/import/generic';
import { depotByNameToIds, SAMPLE_BOX, SAMPLE_DEPOT_BY_NAME } from '../lib/data';
import { PROFESSIONS } from '../lib/types';
import type { Dataset } from '../lib/types';
import { RarityBadge, WarningsList, EmptyHint } from './ui';

interface Props {
  box: Record<string, OperBoxEntry>;
  depot: Depot;
  dataset: Dataset;
  setBox: (b: Record<string, OperBoxEntry>) => void;
  setDepot: (d: Depot) => void;
}

function BoxSummary({ box, dataset }: { box: Record<string, OperBoxEntry>; dataset: Dataset }) {
  const owned = Object.keys(box).length;
  if (owned === 0) return <EmptyHint>box 为空：粘贴 JSON、手动编辑或载入示例。</EmptyHint>;
  const raised = Object.values(box).filter((e) => e.elite === 2).length;
  const byProf: Record<string, number> = {};
  for (const name of Object.keys(box)) {
    const op = dataset.operators.find((o) => o.name === name);
    if (!op) continue;
    byProf[op.profession] = (byProf[op.profession] ?? 0) + 1;
  }
  return (
    <div className="summary-chips">
      <span className="chip">已录入 {owned}</span>
      <span className="chip">精二 {raised}</span>
      {PROFESSIONS.filter((p) => byProf[p]).map((p) => (
        <span key={p} className="chip chip-soft">
          {p} ×{byProf[p]}
        </span>
      ))}
    </div>
  );
}

export default function ImportPanel({ box, depot, dataset, setBox, setDepot }: Props) {
  const [operJson, setOperJson] = useState('');
  const [operAdapterId, setOperAdapterId] = useState('generic');
  const [operMsg, setOperMsg] = useState<{ warnings: string[]; ok?: string; error?: string }>({ warnings: [] });
  const [depotJson, setDepotJson] = useState('');
  const [depotMsg, setDepotMsg] = useState<{ warnings: string[]; ok?: string; error?: string }>({ warnings: [] });

  const importBox = () => {
    const adapter = OPER_BOX_ADAPTERS.find((a) => a.id === operAdapterId);
    if (!adapter?.parse) return;
    try {
      const { value, warnings } = adapter.parse(operJson);
      const merged: Record<string, OperBoxEntry> = { ...box };
      for (const e of value) {
        const known = dataset.operators.some((o) => o.name === e.name);
        if (!known) {
          warnings.push(`「${e.name}」不在当前数据集中，已跳过。`);
          continue;
        }
        merged[e.name] = e;
      }
      setBox(merged);
      setOperMsg({ warnings, ok: `已导入 ${value.length} 条记录。` });
    } catch (e) {
      setOperMsg({ warnings: [], error: e instanceof Error ? e.message : String(e) });
    }
  };

  const importDepot = () => {
    try {
      const { value, warnings } = parseDepotJson(depotJson);
      const { depot: byId, unknownNames } = depotByNameToIds(value, dataset);
      for (const n of unknownNames) warnings.push(`材料「${n}」不在当前数据集中，已跳过。`);
      setDepot({ ...depot, ...byId });
      const total = Object.values(byId).reduce((a, b) => a + b, 0);
      setDepotMsg({ warnings, ok: `已导入 ${Object.keys(byId).length} 种材料（合计 ${total}）。` });
    } catch (e) {
      setDepotMsg({ warnings: [], error: e instanceof Error ? e.message : String(e) });
    }
  };

  const setEntry = (name: string, patch: Partial<OperBoxEntry>) => {
    const next = { ...box };
    const cur: OperBoxEntry = next[name] ?? { name, elite: 0, level: 1 };
    const merged = { ...cur, ...patch };
    if (merged.elite === 0) {
      merged.level = 1;
    } else if (patch.level !== undefined) {
      const lv = Math.round(patch.level);
      merged.level = Math.min(90, Math.max(1, lv));
    }
    next[name] = merged;
    setBox(next);
  };

  const removeEntry = (name: string) => {
    const next = { ...box };
    delete next[name];
    setBox(next);
  };

  return (
    <div className="panel">
      <section className="card">
        <h2>干员 Box</h2>
        <p className="muted">
          「通用 JSON」宽容解析常见字段别名（name / elite / level / potential 及中文名）；「MAA
          干员识别导出」严格解析 MAA 导出内容（格式已对照官方 v6.18.0 源码核实，own=false
          的未拥有干员自动跳过，来源见数据说明页）。
        </p>
        <div className="row" role="group" aria-label="box 导入格式">
          {OPER_BOX_ADAPTERS.map((a) => (
            <button
              key={a.id}
              className={`btn ${operAdapterId === a.id ? '' : 'btn-ghost'}`}
              aria-pressed={operAdapterId === a.id}
              onClick={() => {
                setOperAdapterId(a.id);
                setOperMsg({ warnings: [] });
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="row">
          <button
            className="btn"
            onClick={() => {
              setBox(
                Object.fromEntries(
                  Object.entries(SAMPLE_BOX).map(([name, e]) => [name, { ...e, name }]),
                ),
              );
              setOperJson('');
              setOperMsg({ warnings: [], ok: '已载入示例 box（11 名干员）。' });
            }}
          >
            载入示例 box
          </button>
          <button className="btn btn-ghost" onClick={() => { setBox({}); setOperMsg({ warnings: [] }); }}>
            清空 box
          </button>
        </div>
        <textarea
          value={operJson}
          onChange={(e) => setOperJson(e.target.value)}
          placeholder={'例如：\n[\n  { "name": "芬", "elite": 1, "level": 50 },\n  { "name": "能天使", "elite": 2, "level": 80, "potential": 2 }\n]'}
          rows={6}
        />
        <div className="row">
          <button className="btn btn-primary" onClick={importBox} disabled={!operJson.trim()}>
            解析并导入
          </button>
        </div>
        {operMsg.error ? <div className="error">{operMsg.error}</div> : null}
        {operMsg.ok ? <div className="ok">{operMsg.ok}</div> : null}
        <WarningsList warnings={operMsg.warnings} />
        <h3>手动编辑</h3>
        <BoxSummary box={box} dataset={dataset} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>干员</th>
                <th>职业</th>
                <th>练度</th>
                <th>等级</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dataset.operators.map((op) => {
                const entry = box[op.name];
                return (
                  <tr key={op.name}>
                    <td>
                      <RarityBadge rarity={op.rarity} /> {op.name}
                    </td>
                    <td>{op.profession}</td>
                    <td>
                      <select
                        value={entry?.elite ?? -1}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (v === -1) removeEntry(op.name);
                          else setEntry(op.name, { elite: v as Elite, level: entry?.level ?? 1 });
                        }}
                      >
                        <option value={-1}>未拥有</option>
                        <option value={0}>精零</option>
                        <option value={1}>精一</option>
                        <option value={2}>精二</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={entry?.level ?? 1}
                        disabled={!entry}
                        onChange={(e) => setEntry(op.name, { level: Number(e.target.value) })}
                      />
                    </td>
                    <td className="muted">{entry?.potential !== undefined ? `潜能 ${entry.potential}` : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>材料库存</h2>
        <p className="muted">
          支持条目数组（{'{ name, count }'}）或直接映射（{'{ "固源岩": 42 }'}）两种 JSON 形态。
        </p>
        <div className="row">
          <button className="btn" onClick={() => { setDepot({ ...depot, ...depotByNameToIds(SAMPLE_DEPOT_BY_NAME, dataset).depot }); setDepotMsg({ warnings: [], ok: '已载入示例库存。' }); }}>
            载入示例库存
          </button>
          <button className="btn btn-ghost" onClick={() => { setDepot({}); setDepotMsg({ warnings: [] }); }}>
            清空库存
          </button>
        </div>
        <textarea
          value={depotJson}
          onChange={(e) => setDepotJson(e.target.value)}
          placeholder={'例如：\n{ "源岩": 20, "固源岩": 4 }\n或\n[ { "name": "固源岩", "count": 4 } ]'}
          rows={5}
        />
        <div className="row">
          <button className="btn btn-primary" onClick={importDepot} disabled={!depotJson.trim()}>
            解析并导入
          </button>
        </div>
        {depotMsg.error ? <div className="error">{depotMsg.error}</div> : null}
        {depotMsg.ok ? <div className="ok">{depotMsg.ok}</div> : null}
        <WarningsList warnings={depotMsg.warnings} />
        {Object.keys(depot).length > 0 ? (
          <div className="summary-chips">
            {Object.entries(depot).map(([id, count]) => (
              <span key={id} className="chip">
                {dataset.materials[id]?.name ?? id} ×{count}
              </span>
            ))}
          </div>
        ) : (
          <EmptyHint>尚未录入库存 —— 规划页将按“库存为零”计算。</EmptyHint>
        )}
      </section>
    </div>
  );
}
