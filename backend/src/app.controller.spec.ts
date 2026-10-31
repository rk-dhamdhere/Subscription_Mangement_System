import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('@nestjs/common', () => ({
  Controller: () => (target: unknown) => target,
  Get: () => () => undefined,
  Injectable: () => (target: unknown) => target,
  SetMetadata: () => () => undefined,
}));

import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController(new AppService());
  });

  it('returns the Brightloop backend health status', () => {
    expect(appController.health()).toEqual({
      status: 'ok',
      service: 'brightloop-backend',
    });
  });
});
