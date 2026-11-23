export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  totalPages: number;
  hasNext: boolean;
}
