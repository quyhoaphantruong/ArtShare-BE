import { PaginatedResponseDto } from '../dto/paginated-response.dto';

interface PaginationOptions {
  page: number;
  limit: number;
}

export function generatePaginatedResponse<T>(
  data: T[],
  total: number,
  options: PaginationOptions,
): PaginatedResponseDto<T> {
  const { page, limit } = options;
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
  };
}
