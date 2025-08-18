
import { Suspense } from 'react';
import SearchPageClient from './page-client';
import SearchLoading from './loading';

export default function SearchPage() {
  return (
    <Suspense fallback={<SearchLoading />}>
      <SearchPageClient />
    </Suspense>
  );
}
