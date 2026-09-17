export type PageListArgs = {
	total: number;
	currentPage: number;
	items: number;
	buttons: number;
};

export function generatePageList({ total, currentPage, items, buttons }: PageListArgs): number[] {
	const totalPages = Math.ceil(total / items);
	let firstPage = Math.floor(buttons / 2);
	let lastPage = Math.floor(buttons / 2);

	if (currentPage - firstPage <= 0) {
		lastPage += firstPage - currentPage + 1;
		firstPage = currentPage - 1;
	}

	if (currentPage + lastPage > totalPages) {
		firstPage += lastPage - (totalPages - currentPage);
		lastPage = totalPages - currentPage;
	}

	const pageList: number[] = [];
	const firstArrayPage = currentPage - firstPage;
	const firstIndex = firstArrayPage <= 0 ? 1 : firstArrayPage;
	for (let i = firstIndex; i <= currentPage + lastPage; i++) {
		pageList.push(i);
	}

	return pageList;
}
