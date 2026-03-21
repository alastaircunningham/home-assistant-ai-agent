import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setBasePath } from '../lib/api';

interface IngressContextValue {
  basePath: string;
  ready: boolean;
}

const IngressContext = createContext<IngressContextValue>({ basePath: '', ready: false });

export function useIngress() {
  return useContext(IngressContext);
}

export function IngressProvider({ children }: { children: ReactNode }) {
  const [basePath, setBasePathState] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/ingress')
      .then((res) => {
        if (res.ok) return res.json();
        return { path: '' };
      })
      .then((data) => {
        const path = data.path || '';
        setBasePathState(path);
        setBasePath(path);
      })
      .catch(() => {
        setBasePath('');
      })
      .finally(() => {
        setReady(true);
      });
  }, []);

  return (
    <IngressContext.Provider value={{ basePath, ready }}>
      {children}
    </IngressContext.Provider>
  );
}
