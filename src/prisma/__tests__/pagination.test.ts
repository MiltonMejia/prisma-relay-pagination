import { generatePageList } from '../pagination.js';

describe('generatePageList', () =>
{
	it('centers the window around the current page', () =>
	{
		expect(generatePageList({ total: 150, currentPage: 8, items: 10, buttons: 5 })).toEqual([ 6, 7, 8, 9, 10 ]);
	});

	it('clamps the window at the beginning', () =>
	{
		expect(generatePageList({ total: 150, currentPage: 1, items: 10, buttons: 5 })).toEqual([ 1, 2, 3, 4, 5 ]);
	});

	it('clamps the window at the end', () =>
	{
		expect(generatePageList({ total: 95, currentPage: 10, items: 10, buttons: 5 })).toEqual([ 6, 7, 8, 9, 10 ]);
	});

	it('shrinks the window when there are fewer pages than buttons', () =>
	{
		expect(generatePageList({ total: 20, currentPage: 2, items: 10, buttons: 5 })).toEqual([ 1, 2 ]);
	});

	it('returns an empty list when there are no pages', () =>
	{
		expect(generatePageList({ total: 0, currentPage: 1, items: 10, buttons: 5 })).toEqual([]);
	});
});
