import { describe, expect, it } from 'vitest';
import routes from '../config/routes';

describe('routes', () => {
  it('only shows the current workspace menus in the sidebar', () => {
    const visibleTopLevelMenus = routes
      .filter((route) => route.name && !route.hideInMenu && route.layout !== false)
      .map((route) => route.name);

    expect(visibleTopLevelMenus).toEqual([
      'chatbot',
      'agents',
      'models',
      'tools',
    ]);
  });

  it('adds the initial agent workspace menus', () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/chat',
          name: 'chatbot',
          component: './chatbot',
        }),
        expect.objectContaining({
          path: '/agents',
          name: 'agents',
          component: './agents',
        }),
        expect.objectContaining({
          path: '/models',
          name: 'models',
          component: './model-registry',
        }),
        expect.objectContaining({
          path: '/tools',
          name: 'tools',
          component: './tools',
        }),
      ]),
    );
  });

  it('redirects home to the AI assistant', () => {
    expect(routes).toContainEqual({
      path: '/',
      redirect: '/chat',
    });
  });
});
