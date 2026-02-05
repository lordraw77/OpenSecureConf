import { OpenSecureConfClient, OpenSecureConfError } from '../src/index';

describe('OpenSecureConfClient', () => {
  let client: OpenSecureConfClient;

  beforeEach(() => {
    client = new OpenSecureConfClient({
      baseUrl: 'http://localhost:9000',
      userKey: 'my-secure-encryption-key',
      apiKey: '123456789-api-key',
    });
  });

  describe('constructor', () => {
    it('should create client with valid options', () => {
      expect(client).toBeInstanceOf(OpenSecureConfClient);
    });

    it('should throw error if userKey is too short', () => {
      expect(() => {
        new OpenSecureConfClient({
          baseUrl: 'http://localhost:9000',
          userKey: 'short',
        });
      }).toThrow('userKey must be at least 8 characters long');
    });
  });

  describe('CRUD operations', () => {
    const testKey = 'test-config-key';
    const testValue = { setting: 'value', number: 42 };

    it('should create a configuration', async () => {
      const result = await client.create(testKey, testValue, 'test-category');
      expect(result).toHaveProperty('key', testKey);
      expect(result).toHaveProperty('value');
    });

    it('should read a configuration', async () => {
      const result = await client.read(testKey);
      expect(result).toHaveProperty('key', testKey);
    });

    it('should list configurations', async () => {
      const result = await client.list();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should delete a configuration', async () => {
      const result = await client.delete(testKey);
      expect(result).toHaveProperty('message');
    });
  });
});
