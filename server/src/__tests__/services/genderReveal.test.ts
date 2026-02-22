/**
 * Gender Reveal service tests
 * Tests two-key reveal ceremony: state queries, key validation,
 * admin configuration, reseal, and friend gender input
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type AnyMock = jest.Mock<any>;

// Mock DB query functions
const mockGetConfig = jest.fn() as AnyMock;
const mockCreateConfig = jest.fn() as AnyMock;
const mockUpdateConfig = jest.fn() as AnyMock;
const mockResetRevealState = jest.fn() as AnyMock;

// Mock keyHash utilities
const mockHashKey = jest.fn() as AnyMock;
const mockVerifyKey = jest.fn() as AnyMock;

// Mock logger
const mockLoggerInfo = jest.fn() as AnyMock;
const mockLoggerError = jest.fn() as AnyMock;
const mockLoggerWarn = jest.fn() as AnyMock;

// Mock Prisma models used inside transactions
const mockGenderRevealConfigFindUnique = jest.fn() as AnyMock;
const mockGenderRevealConfigFindFirst = jest.fn() as AnyMock;
const mockGenderRevealConfigUpdate = jest.fn() as AnyMock;
const mockEnvelopeFindUnique = jest.fn() as AnyMock;
const mockTransaction = jest.fn() as AnyMock;

jest.unstable_mockModule('../../db/queries/genderReveal.js', () => ({
  getConfig: mockGetConfig,
  createConfig: mockCreateConfig,
  updateConfig: mockUpdateConfig,
  resetRevealState: mockResetRevealState,
}));

jest.unstable_mockModule('../../utils/keyHash.js', () => ({
  hashKey: mockHashKey,
  verifyKey: mockVerifyKey,
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  logger: {
    info: mockLoggerInfo,
    error: mockLoggerError,
    warn: mockLoggerWarn,
  },
}));

jest.unstable_mockModule('../../db/connection.js', () => ({
  db: {
    $transaction: mockTransaction,
    envelope: {
      findUnique: mockEnvelopeFindUnique,
    },
  },
}));

// Import after mocking
const {
  getRevealState,
  validateKey,
  configureReveal,
  getAdminConfig,
  resealReveal,
  setGenderByFriend,
} = await import('../../services/genderReveal.js');

// Test fixtures
const ENVELOPE_ID = 'env-1';
const PARTICIPANT_A = 'participant-a';
const FRIEND_ID = 'friend-1';

const BASE_CONFIG = {
  envelopeId: ENVELOPE_ID,
  keyA: 'salt-a:hash-a',
  keyB: 'salt-b:hash-b',
  genderValue: 'girl',
  keyAValidated: false,
  keyBValidated: false,
  revealedAt: null,
  setByFriendId: null,
  createdAt: new Date('2026-01-01'),
};

describe('Gender Reveal Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default transaction implementation — includes all models used inside validateKey and setGenderByFriend
    mockTransaction.mockImplementation((callback: (tx: unknown) => Promise<unknown>) => {
      return callback({
        genderRevealConfig: {
          findUnique: mockGenderRevealConfigFindUnique,
          findFirst: mockGenderRevealConfigFindFirst,
          update: mockGenderRevealConfigUpdate,
        },
      });
    });
  });

  // ================================================================
  // getRevealState
  // ================================================================
  describe('getRevealState', () => {
    it('should return unconfigured state when no config exists', async () => {
      mockGetConfig.mockResolvedValue(null);

      const result = await getRevealState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result).toEqual({
        configured: false,
        keysValidated: 0,
        myKeyValidated: false,
        revealed: false,
      });
    });

    it('should return unconfigured state when config exists but no gender value', async () => {
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG, genderValue: null });

      const result = await getRevealState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result).toEqual({
        configured: false,
        keysValidated: 0,
        myKeyValidated: false,
        revealed: false,
      });
    });

    it('should return configured unrevealed state with zero keys validated', async () => {
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG });

      const result = await getRevealState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result).toEqual({
        configured: true,
        keysValidated: 0,
        myKeyValidated: false,
        revealed: false,
        keyLength: 8,
      });
    });

    it('should return configured unrevealed state with one key validated', async () => {
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG, keyAValidated: true });

      const result = await getRevealState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result).toEqual({
        configured: true,
        keysValidated: 1,
        myKeyValidated: false,
        revealed: false,
        keyLength: 8,
      });
    });

    it('should return revealed state with gender when revealedAt is set', async () => {
      mockGetConfig.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: true,
        revealedAt: new Date('2026-02-01'),
      });

      const result = await getRevealState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result).toEqual({
        configured: true,
        keysValidated: 2,
        myKeyValidated: false,
        revealed: true,
        gender: 'girl',
        keyLength: 8,
      });
    });

    it('should count keysValidated correctly when only keyB is validated', async () => {
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG, keyBValidated: true });

      const result = await getRevealState(ENVELOPE_ID, PARTICIPANT_A);

      expect(result.keysValidated).toBe(1);
      expect(result.revealed).toBe(false);
    });
  });

  // ================================================================
  // validateKey
  // ================================================================
  describe('validateKey', () => {
    it('should throw REVEAL_NOT_CONFIGURED when no config exists', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue(null);

      await expect(validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026')).rejects.toThrow(
        'REVEAL_NOT_CONFIGURED'
      );
    });

    it('should throw REVEAL_NOT_CONFIGURED when gender value is not set', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({
        ...BASE_CONFIG,
        genderValue: null,
      });

      await expect(validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026')).rejects.toThrow(
        'REVEAL_NOT_CONFIGURED'
      );
    });

    it('should return already_revealed when both keys are already validated', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: true,
      });

      const result = await validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026');

      expect(result).toEqual({
        status: 'already_revealed',
        gender: 'girl',
      });
      // Should not call verifyKey when already revealed
      expect(mockVerifyKey).not.toHaveBeenCalled();
    });

    it('should return invalid_key when key matches neither A nor B', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({ ...BASE_CONFIG });
      mockVerifyKey.mockResolvedValue(false);

      const result = await validateKey(ENVELOPE_ID, PARTICIPANT_A, '99999999');

      expect(result).toEqual({ status: 'invalid_key' });
      // Both keys should always be evaluated (timing-safe)
      expect(mockVerifyKey).toHaveBeenCalledTimes(2);
      expect(mockVerifyKey).toHaveBeenCalledWith('99999999', 'salt-a:hash-a');
      expect(mockVerifyKey).toHaveBeenCalledWith('99999999', 'salt-b:hash-b');
    });

    it('should return key_already_used when key matches A but A is already validated', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
      });
      mockVerifyKey
        .mockResolvedValueOnce(true)   // matches A
        .mockResolvedValueOnce(false); // does not match B

      const result = await validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026');

      expect(result).toEqual({ status: 'key_already_used' });
    });

    it('should return key_already_used when key matches B but B is already validated', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({
        ...BASE_CONFIG,
        keyBValidated: true,
      });
      mockVerifyKey
        .mockResolvedValueOnce(false)  // does not match A
        .mockResolvedValueOnce(true);  // matches B

      const result = await validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026');

      expect(result).toEqual({ status: 'key_already_used' });
    });

    it('should return waiting_for_partner when first key is validated successfully', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({ ...BASE_CONFIG });
      mockVerifyKey
        .mockResolvedValueOnce(true)   // matches A
        .mockResolvedValueOnce(false); // does not match B
      mockGenderRevealConfigUpdate.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: false,
      });

      const result = await validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026');

      expect(result).toEqual({
        status: 'waiting_for_partner',
        keysValidated: 1,
      });
      expect(mockGenderRevealConfigUpdate).toHaveBeenCalledWith({
        where: { envelopeId: ENVELOPE_ID },
        data: { keyAValidated: true },
      });
    });

    it('should return waiting_for_partner when key B is validated and A is not yet done', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({ ...BASE_CONFIG });
      mockVerifyKey
        .mockResolvedValueOnce(false)  // does not match A
        .mockResolvedValueOnce(true);  // matches B
      mockGenderRevealConfigUpdate.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: false,
        keyBValidated: true,
      });

      const result = await validateKey(ENVELOPE_ID, PARTICIPANT_A, '06152026');

      expect(result).toEqual({
        status: 'waiting_for_partner',
        keysValidated: 1,
      });
      expect(mockGenderRevealConfigUpdate).toHaveBeenCalledWith({
        where: { envelopeId: ENVELOPE_ID },
        data: { keyBValidated: true },
      });
    });

    it('should return revealed with gender when second key completes the reveal', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
      });
      mockVerifyKey
        .mockResolvedValueOnce(false)  // does not match A
        .mockResolvedValueOnce(true);  // matches B
      mockGenderRevealConfigUpdate.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: true,
        revealedAt: new Date('2026-02-01'),
      });

      const result = await validateKey(ENVELOPE_ID, PARTICIPANT_A, '06152026');

      expect(result).toEqual({
        status: 'revealed',
        gender: 'girl',
      });
      // Should set revealedAt because otherKeyValidated is true
      expect(mockGenderRevealConfigUpdate).toHaveBeenCalledWith({
        where: { envelopeId: ENVELOPE_ID },
        data: {
          keyBValidated: true,
          revealedAt: expect.any(Date),
        },
      });
    });

    it('should log when gender reveal is unlocked', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue({
        ...BASE_CONFIG,
        keyBValidated: true,
      });
      mockVerifyKey
        .mockResolvedValueOnce(true)   // matches A
        .mockResolvedValueOnce(false); // does not match B
      mockGenderRevealConfigUpdate.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: true,
        revealedAt: new Date('2026-02-01'),
      });

      await validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026');

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Gender reveal unlocked',
        { envelopeId: ENVELOPE_ID }
      );
    });

    it('should use Serializable isolation level for the transaction', async () => {
      mockGenderRevealConfigFindUnique.mockResolvedValue(null);

      await expect(validateKey(ENVELOPE_ID, PARTICIPANT_A, '01012026')).rejects.toThrow();

      expect(mockTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      );
    });
  });

  // ================================================================
  // configureReveal
  // ================================================================
  describe('configureReveal', () => {
    it('should throw ENVELOPE_NOT_FOUND when envelope does not exist', async () => {
      mockEnvelopeFindUnique.mockResolvedValue(null);

      await expect(
        configureReveal(ENVELOPE_ID, { keyA: '01012026', keyB: '06152026' })
      ).rejects.toThrow('ENVELOPE_NOT_FOUND');
    });

    it('should create new config when none exists', async () => {
      mockEnvelopeFindUnique.mockResolvedValue({ id: ENVELOPE_ID });
      mockGetConfig.mockResolvedValue(null);
      mockHashKey
        .mockResolvedValueOnce('hashed-key-a')
        .mockResolvedValueOnce('hashed-key-b');
      mockCreateConfig.mockResolvedValue({
        ...BASE_CONFIG,
        keyA: 'hashed-key-a',
        keyB: 'hashed-key-b',
        genderValue: null,
      });

      const result = await configureReveal(ENVELOPE_ID, {
        keyA: '01012026',
        keyB: '06152026',
      });

      expect(mockHashKey).toHaveBeenCalledWith('01012026');
      expect(mockHashKey).toHaveBeenCalledWith('06152026');
      expect(mockCreateConfig).toHaveBeenCalledWith(
        ENVELOPE_ID,
        'hashed-key-a',
        'hashed-key-b'
      );
      expect(result).toEqual({
        configured: true,
        genderSet: false,
        keyAValidated: false,
        keyBValidated: false,
        revealedAt: undefined,
      });
    });

    it('should update existing config when not yet revealed', async () => {
      mockEnvelopeFindUnique.mockResolvedValue({ id: ENVELOPE_ID });
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG });
      mockHashKey
        .mockResolvedValueOnce('new-hashed-a')
        .mockResolvedValueOnce('new-hashed-b');
      mockUpdateConfig.mockResolvedValue({
        ...BASE_CONFIG,
        keyA: 'new-hashed-a',
        keyB: 'new-hashed-b',
      });

      const result = await configureReveal(ENVELOPE_ID, {
        keyA: '03032026',
        keyB: '09092026',
      });

      expect(mockUpdateConfig).toHaveBeenCalledWith(ENVELOPE_ID, {
        keyA: 'new-hashed-a',
        keyB: 'new-hashed-b',
      });
      expect(result.configured).toBe(true);
    });

    it('should throw REVEAL_ALREADY_DONE when config has revealedAt set', async () => {
      mockEnvelopeFindUnique.mockResolvedValue({ id: ENVELOPE_ID });
      mockGetConfig.mockResolvedValue({
        ...BASE_CONFIG,
        revealedAt: new Date('2026-02-01'),
      });
      // hashKey is still called before the check
      mockHashKey.mockResolvedValue('any-hash');

      await expect(
        configureReveal(ENVELOPE_ID, { keyA: '01012026', keyB: '06152026' })
      ).rejects.toThrow('REVEAL_ALREADY_DONE');
    });

    it('should include revealedAt as ISO string when present in updated config', async () => {
      mockEnvelopeFindUnique.mockResolvedValue({ id: ENVELOPE_ID });
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG });
      mockHashKey.mockResolvedValue('hashed');
      const revealDate = new Date('2026-02-15T12:00:00.000Z');
      mockUpdateConfig.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: true,
        revealedAt: revealDate,
      });

      const result = await configureReveal(ENVELOPE_ID, {
        keyA: '01012026',
        keyB: '06152026',
      });

      expect(result.revealedAt).toBe('2026-02-15T12:00:00.000Z');
    });

    it('should set genderSet to true when config has a gender value', async () => {
      mockEnvelopeFindUnique.mockResolvedValue({ id: ENVELOPE_ID });
      mockGetConfig.mockResolvedValue(null);
      mockHashKey.mockResolvedValue('hashed');
      mockCreateConfig.mockResolvedValue({
        ...BASE_CONFIG,
        genderValue: 'boy',
      });

      const result = await configureReveal(ENVELOPE_ID, {
        keyA: '01012026',
        keyB: '06152026',
      });

      expect(result.genderSet).toBe(true);
    });
  });

  // ================================================================
  // getAdminConfig
  // ================================================================
  describe('getAdminConfig', () => {
    it('should return unconfigured response when no config exists', async () => {
      mockGetConfig.mockResolvedValue(null);

      const result = await getAdminConfig(ENVELOPE_ID);

      expect(result).toEqual({
        configured: false,
        genderSet: false,
        keyAValidated: false,
        keyBValidated: false,
      });
    });

    it('should return configured response with gender not set', async () => {
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG, genderValue: null });

      const result = await getAdminConfig(ENVELOPE_ID);

      expect(result).toEqual({
        configured: true,
        genderSet: false,
        keyAValidated: false,
        keyBValidated: false,
        revealedAt: undefined,
      });
    });

    it('should return configured response with gender set and keys validated', async () => {
      const revealDate = new Date('2026-02-01T10:00:00.000Z');
      mockGetConfig.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: true,
        revealedAt: revealDate,
      });

      const result = await getAdminConfig(ENVELOPE_ID);

      expect(result).toEqual({
        configured: true,
        genderSet: true,
        keyAValidated: true,
        keyBValidated: true,
        revealedAt: '2026-02-01T10:00:00.000Z',
      });
    });
  });

  // ================================================================
  // resealReveal
  // ================================================================
  describe('resealReveal', () => {
    it('should throw REVEAL_NOT_CONFIGURED when no config exists', async () => {
      mockGetConfig.mockResolvedValue(null);

      await expect(resealReveal(ENVELOPE_ID)).rejects.toThrow(
        'REVEAL_NOT_CONFIGURED'
      );
    });

    it('should reset reveal state and return admin response', async () => {
      mockGetConfig.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: true,
        keyBValidated: true,
        revealedAt: new Date('2026-02-01'),
      });
      mockResetRevealState.mockResolvedValue({
        ...BASE_CONFIG,
        keyAValidated: false,
        keyBValidated: false,
        revealedAt: null,
      });

      const result = await resealReveal(ENVELOPE_ID);

      expect(mockResetRevealState).toHaveBeenCalledWith(ENVELOPE_ID);
      expect(result).toEqual({
        configured: true,
        genderSet: true,
        keyAValidated: false,
        keyBValidated: false,
        revealedAt: undefined,
      });
    });

    it('should reflect genderSet as false when gender value is null after reseal', async () => {
      mockGetConfig.mockResolvedValue({ ...BASE_CONFIG, genderValue: null });
      mockResetRevealState.mockResolvedValue({
        ...BASE_CONFIG,
        genderValue: null,
        keyAValidated: false,
        keyBValidated: false,
        revealedAt: null,
      });

      const result = await resealReveal(ENVELOPE_ID);

      expect(result.genderSet).toBe(false);
    });
  });

  // ================================================================
  // setGenderByFriend
  // ================================================================
  describe('setGenderByFriend', () => {
    it('should throw REVEAL_NOT_CONFIGURED when no config exists', async () => {
      mockGenderRevealConfigFindFirst.mockResolvedValue(null);

      await expect(setGenderByFriend(FRIEND_ID, 'boy')).rejects.toThrow(
        'REVEAL_NOT_CONFIGURED'
      );
    });

    it('should throw GENDER_ALREADY_SET when gender value is not null', async () => {
      mockGenderRevealConfigFindFirst.mockResolvedValue({ ...BASE_CONFIG });

      await expect(setGenderByFriend(FRIEND_ID, 'boy')).rejects.toThrow(
        'GENDER_ALREADY_SET'
      );
    });

    it('should update config with gender value and friend id', async () => {
      mockGenderRevealConfigFindFirst.mockResolvedValue({
        ...BASE_CONFIG,
        genderValue: null,
      });
      mockGenderRevealConfigUpdate.mockResolvedValue({
        ...BASE_CONFIG,
        genderValue: 'boy',
        setByFriendId: FRIEND_ID,
      });

      await setGenderByFriend(FRIEND_ID, 'boy');

      expect(mockGenderRevealConfigUpdate).toHaveBeenCalledWith({
        where: { envelopeId: ENVELOPE_ID },
        data: {
          genderValue: 'boy',
          setByFriendId: FRIEND_ID,
        },
      });
    });

    it('should log after setting gender value', async () => {
      mockGenderRevealConfigFindFirst.mockResolvedValue({
        ...BASE_CONFIG,
        genderValue: null,
      });
      mockGenderRevealConfigUpdate.mockResolvedValue({});

      await setGenderByFriend(FRIEND_ID, 'girl');

      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Gender set by friend keeper',
        { friendId: FRIEND_ID, envelopeId: ENVELOPE_ID }
      );
    });

    it('should use Serializable isolation level for the transaction', async () => {
      mockGenderRevealConfigFindFirst.mockResolvedValue(null);

      await expect(setGenderByFriend(FRIEND_ID, 'boy')).rejects.toThrow();

      expect(mockTransaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      );
    });
  });
});
