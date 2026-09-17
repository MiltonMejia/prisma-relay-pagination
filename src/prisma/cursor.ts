import { createHmac, timingSafeEqual } from 'node:crypto';

const CURSOR_VERSION = 'v1';
const ID_KINDS = ['number', 'string', 'bigint'] as const;

type IdKind = (typeof ID_KINDS)[number];

type CursorPayload = {
	v: string;
	k: IdKind;
	i: string;
	p: number;
};

export type DecodedCursor = { id: string | number | bigint; page: number };

function serializeId(id: string | number | bigint): { k: IdKind; i: string } {
	if (typeof id === 'bigint') return { k: 'bigint', i: id.toString() };
	if (typeof id === 'number') return { k: 'number', i: String(id) };
	return { k: 'string', i: id };
}

function deserializeId(payload: CursorPayload): string | number | bigint {
	if (payload.k === 'bigint') return BigInt(payload.i);
	if (payload.k === 'number') {
		const value = Number(payload.i);
		if (!Number.isFinite(value)) throw new Error('Invalid cursor');
		return value;
	}
	return payload.i;
}

function sign(body: string, secret: string): string {
	return createHmac('sha256', secret).update(body).digest('base64url');
}

function isCursorPayload(value: unknown): value is CursorPayload {
	if (typeof value !== 'object' || value === null) return false;

	const payload = value as Record<string, unknown>;

	return (
		payload.v === CURSOR_VERSION &&
		typeof payload.i === 'string' &&
		typeof payload.p === 'number' &&
		Number.isInteger(payload.p) &&
		payload.p >= 1 &&
		typeof payload.k === 'string' &&
		(ID_KINDS as readonly string[]).includes(payload.k)
	);
}

export function encodeCursor(id: string | number | bigint, page: number, secret?: string): string {
	const payload: CursorPayload = { v: CURSOR_VERSION, ...serializeId(id), p: page };
	const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

	return typeof secret === 'string' && secret.length > 0 ? `${body}.${sign(body, secret)}` : body;
}

export function decodeCursor(cursor: string, secret?: string): DecodedCursor {
	if (typeof cursor !== 'string' || cursor.length === 0) throw new Error('Invalid cursor');

	const separator = cursor.indexOf('.');
	const body = separator === -1 ? cursor : cursor.slice(0, separator);
	const signature = separator === -1 ? undefined : cursor.slice(separator + 1);

	if (typeof secret === 'string' && secret.length > 0) {
		if (typeof signature === 'undefined' || signature.length === 0) throw new Error('Invalid cursor signature');

		const expected = Buffer.from(sign(body, secret), 'utf8');
		const provided = Buffer.from(signature, 'utf8');

		if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
			throw new Error('Invalid cursor signature');
		}
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
	} catch {
		throw new Error('Invalid cursor');
	}

	if (!isCursorPayload(parsed)) throw new Error('Invalid cursor');

	return { id: deserializeId(parsed), page: parsed.p };
}
