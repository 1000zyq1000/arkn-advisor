import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

// App 通过 localStorage 持久化 box 与库存，测试间必须隔离
beforeEach(() => {
  localStorage.clear();
});

afterEach(cleanup);

describe('App UI 冒烟（jsdom）', () => {
  it('渲染标题；默认真实数据集不带样例横幅，且提供数据源切换', () => {
    render(<App />);
    expect(screen.getByText('方舟培养参谋')).toBeTruthy();
    expect(screen.queryByText(/内置样例数据/)).toBeNull();
    const selector = screen.getByLabelText('数据源')!;
    expect((selector as HTMLSelectElement).value).toBe('real');
  });

  it('切换到样例数据集后显示诚实横幅', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('数据源'), 'sample');
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
    await user.selectOptions(screen.getByLabelText('数据源'), 'sample');
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
    const selects = screen
      .getAllByRole('combobox')
      .filter((el) => el.id !== 'dataset-switch');
    // 第一行是阿米娅（样例/真实数据集的首个干员一致）
    await user.selectOptions(selects[0]!, '2');
    expect(screen.getByText('已录入 1')).toBeTruthy();
    expect(screen.getByText('精二 1')).toBeTruthy();
  });

  it('数据说明页展示数据源状态（真实数据已接入，MAA 已核实，掉率待接入）', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: '数据说明' }));
    expect(screen.getByText('数据源状态')).toBeTruthy();
    expect(screen.getByText(/真实游戏数据（默认）/)).toBeTruthy();
    expect(screen.getByText(/MAA 干员识别 \/ 仓库识别导出/)).toBeTruthy();
    // 真实掉率与挑战关卡标注如实展示为待核实/规划中
    expect(screen.getAllByText('待核实').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('可用').length).toBeGreaterThanOrEqual(3);
  });

  it('MAA 导入适配器：粘贴官方导出（含未拥有条目）只导入 own=true', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'MAA 干员识别导出' }));
    const maaExport = JSON.stringify([
      { id: 'char_103_angel', name: '能天使', elite: 2, level: 80, own: true, potential: 2, rarity: 6 },
      { id: 'char_999_x', name: '未拥有干员', elite: 0, level: 0, own: false, rarity: 3 },
    ]);
    // JSON 含 { }，user.type 会当作按键描述符，改用 fireEvent 直接赋值
    fireEvent.change(screen.getAllByRole('textbox')[0]!, { target: { value: maaExport } });
    const importBtns = screen.getAllByRole('button', { name: '解析并导入' });
    await user.click(importBtns[0]!);
    expect(screen.getByText('已导入 1 条记录。')).toBeTruthy();
    expect(screen.getByText(/已跳过 1 条 own=false/)).toBeTruthy();
    expect(screen.getByText('已录入 1')).toBeTruthy();
  });
});
