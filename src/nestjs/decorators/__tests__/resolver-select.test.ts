import { buildResolverSelect } from '../resolver-select.js';

describe('buildResolverSelect', () => {
	it('returns the node select for a paginated field', () => {
		const raw = {
			select: {
				totalCount: true,
				pageEdges: { select: { node: { select: { id: true, nombre: true } } } },
			},
		};

		expect(buildResolverSelect(raw, { isPagination: true })).toEqual({ id: true, nombre: true });
	});

	it('falls back to { id: true } when pageEdges is not requested', () => {
		const raw = { select: { totalCount: true } };

		expect(buildResolverSelect(raw, { isPagination: true })).toEqual({ id: true });
	});

	it('falls back to { id: true } when pageEdges has no node select', () => {
		const raw = { select: { totalCount: true, pageEdges: { select: {} } } };

		expect(buildResolverSelect(raw, { isPagination: true })).toEqual({ id: true });
	});

	it('falls back to { id: true } when the raw select is empty or undefined', () => {
		expect(buildResolverSelect({ select: {} }, { isPagination: true })).toEqual({ id: true });
		expect(buildResolverSelect(undefined, { isPagination: true })).toEqual({ id: true });
	});

	it('returns the base select for a non paginated field', () => {
		const raw = { select: { id: true, nombre: true } };

		expect(buildResolverSelect(raw, { isPagination: false })).toEqual({ id: true, nombre: true });
	});

	it('applies the omit list to the resolved select', () => {
		const raw = {
			select: {
				totalCount: true,
				pageEdges: { select: { node: { select: { id: true, nombre: true, secreto: true } } } },
			},
		};

		expect(buildResolverSelect(raw, { isPagination: true, omit: ['secreto'] })).toEqual({ id: true, nombre: true });
	});

	it('does not omit when there is no node select', () => {
		const raw = { select: { totalCount: true } };

		expect(buildResolverSelect(raw, { isPagination: true, omit: ['secreto'] })).toEqual({ id: true });
	});
});
