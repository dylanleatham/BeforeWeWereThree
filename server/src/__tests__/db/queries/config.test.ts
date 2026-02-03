/**
 * Config queries tests
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = jest.Mock<any>;

// Create mock functions for appConfig model
const mockAppConfig = {
  findUnique: jest.fn() as AnyMock,
  upsert: jest.fn() as AnyMock,
};

jest.unstable_mockModule('../../../db/connection.js', () => ({
  db: {
    appConfig: mockAppConfig,
  },
}));

// Import after mocking
const { getGuestPin, getAdminPin, setPin, getConfig, setConfig } = await import(
  '../../../db/queries/config.js'
);

describe('Config Queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getGuestPin', () => {
    it('should return guest PIN when it exists', async () => {
      mockAppConfig.findUnique.mockResolvedValue({
        key: 'guest_pin',
        value: '01152025',
      });

      const result = await getGuestPin();

      expect(result).toBe('01152025');
      expect(mockAppConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'guest_pin' },
      });
    });

    it('should return null when guest PIN does not exist', async () => {
      mockAppConfig.findUnique.mockResolvedValue(null);

      const result = await getGuestPin();

      expect(result).toBeNull();
    });

    it('should return null when config has no value', async () => {
      mockAppConfig.findUnique.mockResolvedValue({
        key: 'guest_pin',
        value: undefined,
      });

      const result = await getGuestPin();

      expect(result).toBeNull();
    });
  });

  describe('getAdminPin', () => {
    it('should return admin PIN when it exists', async () => {
      mockAppConfig.findUnique.mockResolvedValue({
        key: 'admin_pin',
        value: '12251990',
      });

      const result = await getAdminPin();

      expect(result).toBe('12251990');
      expect(mockAppConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'admin_pin' },
      });
    });

    it('should return null when admin PIN does not exist', async () => {
      mockAppConfig.findUnique.mockResolvedValue(null);

      const result = await getAdminPin();

      expect(result).toBeNull();
    });
  });

  describe('setPin', () => {
    it('should upsert guest PIN', async () => {
      mockAppConfig.upsert.mockResolvedValue({
        key: 'guest_pin',
        value: '01152025',
      });

      await setPin('guest_pin', '01152025');

      expect(mockAppConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'guest_pin' },
        update: { value: '01152025' },
        create: { key: 'guest_pin', value: '01152025' },
      });
    });

    it('should upsert admin PIN', async () => {
      mockAppConfig.upsert.mockResolvedValue({
        key: 'admin_pin',
        value: '12251990',
      });

      await setPin('admin_pin', '12251990');

      expect(mockAppConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'admin_pin' },
        update: { value: '12251990' },
        create: { key: 'admin_pin', value: '12251990' },
      });
    });
  });

  describe('getConfig', () => {
    it('should return config value when it exists', async () => {
      mockAppConfig.findUnique.mockResolvedValue({
        key: 'spotify_url',
        value: 'https://open.spotify.com/playlist/123',
      });

      const result = await getConfig('spotify_url');

      expect(result).toBe('https://open.spotify.com/playlist/123');
      expect(mockAppConfig.findUnique).toHaveBeenCalledWith({
        where: { key: 'spotify_url' },
      });
    });

    it('should return null when config does not exist', async () => {
      mockAppConfig.findUnique.mockResolvedValue(null);

      const result = await getConfig('nonexistent_key');

      expect(result).toBeNull();
    });
  });

  describe('setConfig', () => {
    it('should upsert config value', async () => {
      mockAppConfig.upsert.mockResolvedValue({
        key: 'spotify_url',
        value: 'https://open.spotify.com/playlist/456',
      });

      await setConfig('spotify_url', 'https://open.spotify.com/playlist/456');

      expect(mockAppConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'spotify_url' },
        update: { value: 'https://open.spotify.com/playlist/456' },
        create: { key: 'spotify_url', value: 'https://open.spotify.com/playlist/456' },
      });
    });

    it('should handle empty string value', async () => {
      mockAppConfig.upsert.mockResolvedValue({
        key: 'some_key',
        value: '',
      });

      await setConfig('some_key', '');

      expect(mockAppConfig.upsert).toHaveBeenCalledWith({
        where: { key: 'some_key' },
        update: { value: '' },
        create: { key: 'some_key', value: '' },
      });
    });
  });
});
