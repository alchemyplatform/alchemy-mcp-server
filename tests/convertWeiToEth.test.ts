import { test, describe } from 'node:test';
import assert from 'node:assert';
import { convertEthToWei, convertWeiToEth } from '../utils/convertWeiToEth.ts';

describe('Wei/ETH Conversion Functions', () => {
  describe('convertEthToWei', () => {
    test('should convert 1 ETH to Wei correctly', () => {
      const result = convertEthToWei('1');
      assert.strictEqual(result, '1000000000000000000');
    });

    test('should convert 0.5 ETH to Wei correctly', () => {
      const result = convertEthToWei('0.5');
      assert.strictEqual(result, '500000000000000000');
    });

    test('should convert 0.001 ETH to Wei correctly', () => {
      const result = convertEthToWei('0.001');
      assert.strictEqual(result, '1000000000000000');
    });

    test('should convert 0 ETH to Wei correctly', () => {
      const result = convertEthToWei('0');
      assert.strictEqual(result, '0');
    });

    test('should handle small decimal values', () => {
      const result = convertEthToWei('0.000000000000000001');
      assert.strictEqual(result, '1');
    });

    test('should handle large ETH values', () => {
      const result = convertEthToWei('1000');
      assert.strictEqual(result, '1000000000000000000000');
    });
  });

  describe('convertWeiToEth', () => {
    test('should convert 1000000000000000000 Wei to 1 ETH', () => {
      const result = convertWeiToEth('1000000000000000000');
      assert.strictEqual(result, '1');
    });

    test('should convert 500000000000000000 Wei to 0 ETH (due to integer division)', () => {
      const result = convertWeiToEth('500000000000000000');
      assert.strictEqual(result, '0');
    });

    test('should convert 0 Wei to 0 ETH', () => {
      const result = convertWeiToEth('0');
      assert.strictEqual(result, '0');
    });

    test('should handle large Wei values', () => {
      const result = convertWeiToEth('1000000000000000000000');
      assert.strictEqual(result, '1000');
    });
  });

  describe('Round-trip conversion tests', () => {
    test('should maintain precision for whole ETH values', () => {
      const originalEth = '1';
      const wei = convertEthToWei(originalEth);
      const backToEth = convertWeiToEth(wei);
      assert.strictEqual(backToEth, originalEth);
    });

    test('should maintain precision for large whole ETH values', () => {
      const originalEth = '100';
      const wei = convertEthToWei(originalEth);
      const backToEth = convertWeiToEth(wei);
      assert.strictEqual(backToEth, originalEth);
    });
  });
}); 
