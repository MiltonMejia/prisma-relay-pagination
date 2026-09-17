import { decodeCursor, encodeCursor } from '../cursor.js';

describe('cursor', () =>
{
	it('round-trips number ids', () =>
	{
		const cursor = encodeCursor(42, 3);

		expect(typeof cursor).toBe('string');
		expect(decodeCursor(cursor)).toEqual({ id: 42, page: 3 });
	});

	it('round-trips string ids', () =>
	{
		const cursor = encodeCursor('user_01H', 7);

		expect(decodeCursor(cursor)).toEqual({ id: 'user_01H', page: 7 });
	});

	it('round-trips bigint ids', () =>
	{
		const cursor = encodeCursor(9007199254740993n, 2);

		expect(decodeCursor(cursor)).toEqual({ id: 9007199254740993n, page: 2 });
	});

	it('rejects malformed cursors', () =>
	{
		expect(() => decodeCursor('%%%')).toThrow('Invalid cursor');
		expect(() => decodeCursor(Buffer.from('{"p":0}').toString('base64url'))).toThrow('Invalid cursor');
		expect(() => decodeCursor('')).toThrow('Invalid cursor');
	});

	it('does not verify signatures when no secret is provided', () =>
	{
		const signed = encodeCursor(1, 1, 'secret');

		expect(decodeCursor(signed)).toEqual({ id: 1, page: 1 });
	});

	it('verifies signatures when a secret is provided', () =>
	{
		const signed = encodeCursor(1, 1, 'secret');

		expect(decodeCursor(signed, 'secret')).toEqual({ id: 1, page: 1 });
		expect(() => decodeCursor(encodeCursor(1, 1), 'secret')).toThrow('Invalid cursor signature');
		expect(() => decodeCursor(signed, 'other-secret')).toThrow('Invalid cursor signature');
	});

	it('rejects tampered signed payloads', () =>
	{
		const signed = encodeCursor(1, 1, 'secret');
		const [ body, signature ] = signed.split('.');
		const tampered = `${encodeCursor(999, 1).split('.')[0]}.${signature}`;

		expect(body).toBeDefined();
		expect(() => decodeCursor(tampered, 'secret')).toThrow('Invalid cursor signature');
	});
});
