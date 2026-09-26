import { useEffect, useState } from 'react';
import pkg from '../package.json';
import type { Depot, OperBoxEntry } from './lib/types';
import { loadDataset } from './lib/data';
import ErrorBoundary from './components/ErrorBoundary';
import ImportPanel from './components/ImportPanel';
import RecommendPanel from './components/RecommendPanel';
import PlanPanel from './components/PlanPanel';
import AboutPanel from './components/AboutPanel';

const TABS = [
  { id: 'import', label: '① 导入' },
  { id: 'recommend', label: '② 培养推荐' },
  { id: 'plan', label: '③ 养成规划' },
  { id: 'about', label: '数据说明' },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface Persisted {
  box: Record<string, OperBoxEntry>;
  depot: Depot;
}

const STORAGE_KEY = 'arkn-advisor:v1';

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted;
      if (parsed && typeof parsed === 'object') {
        return { box: parsed.box ?? {}, depot: parsed.depot ?? {} };
      }
    }
  } catch {
    // 忽略损坏的本地存档，从空白开始
  }
  return { box: {}, depot: {} };
}

export default function App() {
  const dataset = loadDataset();
  const [tab, setTab] = useState<TabId>('import');
  const [{ box, depot }, setState] = useState<Persisted>(loadPersisted);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ box, depot }));
    } catch {
      // 存储不可用（如隐私模式）时静默降级
    }
  }, [box, depot]);

  return (
    <div className="app">
      <header className="header">
        <h1>方舟培养参谋</h1>
        <p className="tagline">练谁 · 缺什么 · 去哪刷 —— 开源的明日方舟培养规划工具</p>
        {dataset.isSample ? (
          <div className="sample-banner" role="status">
            ⚠ 当前使用<strong>内置样例数据</strong>（合成数值，仅供功能演示）——
            推荐与规划结果不可作为游戏攻略依据。数据源接入进度见「数据说明」。
          </div>
        ) : null}
      </header>

      <nav className="tabs" aria-label="功能页">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <ErrorBoundary>
          {tab === 'import' ? (
            <ImportPanel
              box={box}
              depot={depot}
              dataset={dataset}
              setBox={(b) => setState((s) => ({ ...s, box: b }))}
              setDepot={(d) => setState((s) => ({ ...s, depot: d }))}
            />
          ) : null}
          {tab === 'recommend' ? <RecommendPanel box={box} dataset={dataset} /> : null}
          {tab === 'plan' ? <PlanPanel box={box} depot={depot} dataset={dataset} /> : null}
          {tab === 'about' ? <AboutPanel dataset={dataset} /> : null}
        </ErrorBoundary>
      </main>

      <footer className="footer">
        方舟培养参谋 v{pkg.version} · 纯本地计算 · 不上传任何数据 · MIT 开源 ——
        数据来源与状态见「数据说明」
      </footer>
    </div>
  );
}
