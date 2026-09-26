import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** 兜底错误边界：面板渲染异常时给出可读提示，而不是白屏。 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="card error" role="alert">
          <strong>界面出现意外错误</strong>
          <p className="small">{error.message}</p>
          <button className="btn" onClick={() => location.reload()}>
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
