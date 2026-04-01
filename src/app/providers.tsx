'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipPrimitive } from '@/components/ui/tooltip';
import { CurrentUserContext } from '@/lib/hooks/use-current-user';
import { useCurrentUserProvider } from '@/lib/hooks/use-current-user';
import { usePermissions } from '@/lib/hooks/use-permissions';

function PermissionsLoader({ children }: { children: React.ReactNode }) {
  // This hook loads member permissions from the API and syncs them
  // into the runtime permissions module on mount
  usePermissions();
  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const userContext = useCurrentUserProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <CurrentUserContext.Provider value={userContext}>
        <TooltipPrimitive.Provider delayDuration={200}>
          <ToastProvider>
            <PermissionsLoader>
              {children}
            </PermissionsLoader>
          </ToastProvider>
        </TooltipPrimitive.Provider>
      </CurrentUserContext.Provider>
    </QueryClientProvider>
  );
}
