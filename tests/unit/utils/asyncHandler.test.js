const { asyncHandler } = require('../../../utils/asyncHandler');

describe('asyncHandler', () => {
  it('should handle successful async function', async () => {
    const asyncFn = async (req, res, next) => {
      res.json({ success: true });
    };

    const handler = asyncHandler(asyncFn);
    const req = {};
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await handler(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch and forward errors to next', async () => {
    const error = new Error('Test error');
    const asyncFn = async (req, res, next) => {
      throw error;
    };

    const handler = asyncHandler(asyncFn);
    const req = {};
    const res = {};
    const next = jest.fn();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should handle synchronous errors', async () => {
    const error = new Error('Sync error');
    const asyncFn = (req, res, next) => {
      throw error;
    };

    const handler = asyncHandler(asyncFn);
    const req = {};
    const res = {};
    const next = jest.fn();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should preserve req, res, next context', async () => {
    const asyncFn = async (req, res, next) => {
      req.customProperty = 'test';
      res.customProperty = 'test';
      res.json({ success: true });
    };

    const handler = asyncHandler(asyncFn);
    const req = {};
    const res = {
      json: jest.fn(),
    };
    const next = jest.fn();

    await handler(req, res, next);

    expect(req.customProperty).toBe('test');
    expect(res.customProperty).toBe('test');
  });

  it('should handle errors with custom status codes', async () => {
    const customError = new Error('Custom error');
    customError.statusCode = 404;
    const asyncFn = async (req, res, next) => {
      throw customError;
    };

    const handler = asyncHandler(asyncFn);
    const req = {};
    const res = {};
    const next = jest.fn();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(customError);
    expect(customError.statusCode).toBe(404);
  });
});

