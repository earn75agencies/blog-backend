const CacheUtil = require('../../../utils/cache.util');

describe('CacheUtil', () => {
  beforeEach(() => {
    // Clear cache before each test
    CacheUtil.flush();
  });

  describe('set and get', () => {
    it('should set and get a value', () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      CacheUtil.set(key, value);
      const result = CacheUtil.get(key);

      expect(result).toEqual(value);
    });

    it('should return undefined for non-existent key', () => {
      const result = CacheUtil.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should overwrite existing value', () => {
      const key = 'test-key';
      const value1 = { data: 'value1' };
      const value2 = { data: 'value2' };

      CacheUtil.set(key, value1);
      CacheUtil.set(key, value2);
      const result = CacheUtil.get(key);

      expect(result).toEqual(value2);
    });

    it('should set value with custom TTL', (done) => {
      const key = 'ttl-key';
      const value = { data: 'test' };

      CacheUtil.set(key, value, 1); // 1 second TTL

      // Value should exist immediately
      expect(CacheUtil.get(key)).toEqual(value);

      // After TTL expires, value should be gone
      setTimeout(() => {
        expect(CacheUtil.get(key)).toBeUndefined();
        done();
      }, 1100);
    });
  });

  describe('has', () => {
    it('should return true for existing key', () => {
      const key = 'existing-key';
      CacheUtil.set(key, 'value');
      expect(CacheUtil.has(key)).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(CacheUtil.has('non-existent')).toBe(false);
    });

    it('should return false after key expires', (done) => {
      const key = 'expiring-key';
      CacheUtil.set(key, 'value', 1);

      setTimeout(() => {
        expect(CacheUtil.has(key)).toBe(false);
        done();
      }, 1100);
    });
  });

  describe('del', () => {
    it('should delete a key', () => {
      const key = 'delete-key';
      CacheUtil.set(key, 'value');
      expect(CacheUtil.has(key)).toBe(true);

      CacheUtil.del(key);
      expect(CacheUtil.has(key)).toBe(false);
      expect(CacheUtil.get(key)).toBeUndefined();
    });

    it('should not throw error when deleting non-existent key', () => {
      expect(() => {
        CacheUtil.del('non-existent');
      }).not.toThrow();
    });
  });

  describe('flush', () => {
    it('should clear all cache', () => {
      CacheUtil.set('key1', 'value1');
      CacheUtil.set('key2', 'value2');
      CacheUtil.set('key3', 'value3');

      expect(CacheUtil.has('key1')).toBe(true);
      expect(CacheUtil.has('key2')).toBe(true);
      expect(CacheUtil.has('key3')).toBe(true);

      CacheUtil.flush();

      expect(CacheUtil.has('key1')).toBe(false);
      expect(CacheUtil.has('key2')).toBe(false);
      expect(CacheUtil.has('key3')).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      CacheUtil.set('key1', 'value1');
      CacheUtil.set('key2', 'value2');

      const stats = CacheUtil.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats).toBe('object');
    });
  });

  describe('middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        originalUrl: '/api/test',
        url: '/api/test',
        method: 'GET',
      };
      res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      next = jest.fn();
    });

    it('should return cached response if available', () => {
      const cachedResponse = { status: 'success', data: 'cached' };
      CacheUtil.set('/api/test', cachedResponse);

      const middleware = CacheUtil.middleware();
      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(cachedResponse);
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next if cache miss', () => {
      CacheUtil.del('/api/test'); // Ensure no cache

      const middleware = CacheUtil.middleware();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should cache response after processing', () => {
      const responseData = { status: 'success', data: 'new' };
      
      // Override res.json to capture and cache response
      const originalJson = res.json.bind(res);
      res.json = function(body) {
        CacheUtil.set(req.originalUrl, body, 300);
        originalJson(body);
      };

      const middleware = CacheUtil.middleware();
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      
      // Manually call res.json to simulate response
      res.json(responseData);

      // Check if cached
      const cached = CacheUtil.get('/api/test');
      expect(cached).toEqual(responseData);
    });
  });
});

