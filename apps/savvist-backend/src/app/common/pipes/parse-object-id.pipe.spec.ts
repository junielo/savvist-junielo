import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ParseObjectIdPipe } from './parse-object-id.pipe';

describe('ParseObjectIdPipe', () => {
  let pipe: ParseObjectIdPipe;

  beforeEach(() => {
    pipe = new ParseObjectIdPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should transform a valid hex string to ObjectId', () => {
    const validHex = '665f1c2a9b1e8a0012a1c001';
    const result = pipe.transform(validHex);
    expect(result).toBeInstanceOf(Types.ObjectId);
    expect(result.toHexString()).toBe(validHex);
  });

  it('should throw BadRequestException on invalid ObjectId string', () => {
    expect(() => pipe.transform('invalid-id')).toThrow(BadRequestException);
  });
});

