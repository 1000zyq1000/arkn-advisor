/** 小型共享 UI 组件 */
import type { ReactNode } from 'react';

export function RarityBadge({ rarity }: { rarity: number }) {
  return <span className={`rarity r${rarity}`}>{rarity}★</span>;
}

export function TagChips({ tags }: { tags: string[] }) {
  return (
    <span className="tag-row">
      {tags.map((t) => (
        <span key={t} className="tag-chip">
          {t}
        </span>
      ))}
    </span>
  );
}

export function WarningsList({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) return null;
  return (
    <div className="warnings" role="alert">
      <strong>提示（{warnings.length}）</strong>
      <ul>
        {warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <div className="empty-hint">{children}</div>;
}
