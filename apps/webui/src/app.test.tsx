import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock all heavy dependencies before importing app
const mockReplace = vi.fn();
const mockHistory = {
  location: {
    pathname: '/welcome',
    search: '',
    hash: '',
  },
  replace: mockReplace,
};

const mockQueryCurrentUser = vi.fn();

vi.mock('@umijs/max', () => ({
  history: mockHistory,
  Link: ({ children }: any) => children,
}));

vi.mock('@/services/ant-design-pro/api', () => ({
  currentUser: mockQueryCurrentUser,
}));

vi.mock('@/components', () => ({
  AvatarDropdown: () => null,
  DocLink: () => null,
  ErrorBoundary: ({ children }: any) => children,
  Footer: () => null,
  LangDropdown: () => null,
  OfflineBanner: () => null,
  VersionDropdown: () => null,
}));

vi.mock('@ant-design/pro-components', () => ({
  SettingDrawer: () => null,
}));

vi.mock('@ant-design/icons', () => ({
  LinkOutlined: () => null,
}));

vi.mock('./requestErrorConfig', () => ({
  errorConfig: {},
}));

vi.mock('../config/defaultSettings', () => ({
  default: { navTheme: 'light' },
}));

describe('app getInitialState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHistory.location = {
      pathname: '/welcome',
      search: '',
      hash: '',
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return local currentUser without fetching remote user', async () => {
    const { getInitialState } = await import('./app');

    const state = await getInitialState();

    expect(mockQueryCurrentUser).not.toHaveBeenCalled();
    expect(state.currentUser).toEqual({
      name: 'CrazyClaw',
      avatar: '/pro_icon.svg',
      access: 'admin',
    });
    expect(state.settingDrawerOpen).toBe(false);
    expect(state.fetchUserInfo).toBeDefined();
  });

  it('should not redirect when remote currentUser would fail', async () => {
    const { getInitialState } = await import('./app');
    mockQueryCurrentUser.mockRejectedValue(new Error('401 Unauthorized'));

    const state = await getInitialState();

    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockQueryCurrentUser).not.toHaveBeenCalled();
    expect(state.currentUser).toEqual({
      name: 'CrazyClaw',
      avatar: '/pro_icon.svg',
      access: 'admin',
    });
  });

  it('should include default settings in initial state', async () => {
    const { getInitialState } = await import('./app');

    const state = await getInitialState();

    expect(state.settings).toEqual({ navTheme: 'light' });
  });

  it('fetchUserInfo should return local user data', async () => {
    const { getInitialState } = await import('./app');

    const state = await getInitialState();

    const user = await state.fetchUserInfo?.();
    expect(user).toEqual({
      name: 'CrazyClaw',
      avatar: '/pro_icon.svg',
      access: 'admin',
    });
  });
});

describe('app request', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the local CrazyClaw API by default', async () => {
    vi.resetModules();

    const { request } = await import('./app');

    expect(request.baseURL).toBe('http://localhost:3000');
  });

  it('allows overriding the CrazyClaw API base URL', async () => {
    vi.resetModules();
    vi.stubEnv('UMI_APP_API_BASE_URL', 'http://127.0.0.1:3456');

    const { request } = await import('./app');

    expect(request.baseURL).toBe('http://127.0.0.1:3456');
  });
});

describe('app layout', () => {
  it('does not expose the OpenAPI shortcut link', async () => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'development');

    const { layout } = await import('./app');
    const config = layout({
      initialState: { settings: {} },
      setInitialState: vi.fn(),
    } as any);

    expect(config.links).toEqual([]);
  });

  it('does not redirect to login on page change', async () => {
    vi.resetModules();

    const { layout } = await import('./app');
    const config = layout({
      initialState: { settings: {} },
      setInitialState: vi.fn(),
    } as any);

    config.onPageChange?.({} as any);

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
