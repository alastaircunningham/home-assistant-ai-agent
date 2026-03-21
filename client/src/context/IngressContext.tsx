import { createContext, useContext, type ReactNode } from 'react';
import { setBasePath } from '../lib/api';

interface IngressContextValue {
  basePath: string;
  ready: boolean;
}

// Derive ingress base path synchronously from window.location.pathname.
// Inside HA ingress the pathname is /api/hassio_ingress/TOKEN/...
// Outside HA (local dev) the pathname is just /.
function detectBasePath(): string {
  const match = window.location.pathname.match(/^(\/api\/hassio_ingress\/[^/]+)/);
  return match ? match[1] : '';
}

const detectedPath = detectBasePath();
setBasePath(detectedPath);

const IngressContext = createContext<IngressContextValue>({ basePath: detectedPath, ready: true });

export function useIngress() {
  return useContext(IngressContext);
}

export function IngressProvider({ children }: { children: ReactNode }) {
  return (
    <IngressContext.Provider value={{ basePath: detectedPath, ready: true }}>
      {children}
    </IngressContext.Provider>
  );
}
