'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipPrimitive } from '@/components/ui/tooltip';
import { CurrentUserContext } from '@/lib/hooks/use-current-user';
import { useCurrentUserProvider } from '@/lib/hooks/use-current-user';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const userContext = useCurrentUserProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserContext.Provider value={userContext}>
        <TooltipPrimitive.Provider delayDuration={200}>
          <ToastProvider>{children}</ToastProvider>
        </TooltipPrimitive.Provider>
      </CurrentUserContext.Provider>
    </QueryClientProvider>
  );
}
