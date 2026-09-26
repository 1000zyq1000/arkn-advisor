import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

// App 通过 localStorage 持久化 box 与库存，测试间必须隔离
beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe('App UI 冒烟（jsdom）', () => {
  it('渲染标题与样例数据横幅', () => {
    render(<App />);
    expect(screen.getByText('方舟培养参谋')).toBeTruthy();
    expect(screen.getByText(/内置样例数据/)).toBeTruthy();
  });

  it('载入示例 box 后摘要显示 11 名干员（精二 0）', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '载入示例 box' }));
    expect(screen.getByText('已录入 11')).toBeTruthy();
    expect(screen.getByText('精二 0')).toBeTruthy();
  });

  it('示例数据下可完成一次完整规划', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '载入示例 box' }));
    await user.click(screen.getByRole('button', { name: '载入示例库存' }));
    await user.click(screen.getByRole('button', { name: '③ 养成规划' }));
    await user.click(screen.getByRole('button', { name: '开始规划' }));
    expect(screen.getByText(/预计总理智/)).toBeTruthy();
  });

  it('生成推荐输出 Top 10 且每条附理由', async () => {
    const user = userEvent.setup();
    const { container } = render(<App />);
    await user.click(screen.getByRole('button', { name: '载入示例 box' }));
    await user.click(screen.getByRole('button', { name: '② 培养推荐' }));
    await user.click(screen.getByRole('button', { name: '生成推荐（Top 10）' }));
    const items = container.querySelectorAll('.rec-item');
    expect(items.length).toBe(10);
    for (const item of items) {
      expect(item.querySelectorAll('.reasons li').length).toBeGreaterThan(0);
    }
  });

  it('手动编辑 box：设为精二后摘要更新', async () => {
    const user = userEvent.setup();
    render(<App />);
    const selects = screen.getAllByRole('combobox');
    // 第一行是阿米娅（样例数据集顺序）
    await user.selectOptions(selects[0]!, '2');
    expect(screen.getByText('已录入 1')).toBeTruthy();
    expect(screen.getByText('精二 1')).toBeTruthy();
  });

  it('数据说明页展示数据源状态与 MAA 待核实声明', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '数据说明' }));
    expect(screen.getByText('数据源状态')).toBeTruthy();
    expect(screen.getByText(/MAA 干员识别 \/ 仓库识别导出/)).toBeTruthy();
    expect(screen.getByText('待核实')).toBeTruthy();
  });
});
