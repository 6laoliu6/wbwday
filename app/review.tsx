import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

import { toDateKey } from '@/utils/date';

export default function TodayReviewRedirect() {
  useEffect(() => {
    router.replace(`/review/${toDateKey()}` as Href);
  }, []);

  return null;
}
