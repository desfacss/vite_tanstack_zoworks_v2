// // src/context/NestedContext.tsx
// import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
// import { v4 as uuidv4 } from 'uuid'; // You'll need to install 'uuid'

// // Define the shape of a single context entry
// interface ContextEntry {
//   id: string; // Unique ID for each open drawer
//   config: any;
//   viewConfig: any;
//   editItem?: any;
// }

// interface NestedContextType {
//   contextStack: ContextEntry[];
//   openContext: (entry: Omit<ContextEntry, 'id'>) => string;
//   closeContext: (id: string) => void;
// }

// const NestedContext = createContext<NestedContextType | undefined>(undefined);

// export const useNestedContext = () => {
//   const context = useContext(NestedContext);
//   if (!context) {
//     throw new Error('useNestedContext must be used within a NestedProvider');
//   }
//   return context;
// };

// export const NestedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
//   const [contextStack, setContextStack] = useState<ContextEntry[]>([]);

//   const openContext = (entry: Omit<ContextEntry, 'id'>) => {
//     const id = uuidv4();
//     const newEntry = { ...entry, id };
//     setContextStack((prev) => [...prev, newEntry]);
//     return id; // Return the new ID so the component can track it
//   };

//   const closeContext = (id: string) => {
//     setContextStack((prev) => prev.filter((entry) => entry.id !== id));
//   };

//   const value = useMemo(() => ({ contextStack, openContext, closeContext }), [contextStack]);

//   return <NestedContext.Provider value={value}>{children}</NestedContext.Provider>;
// };



import React, { createContext, useContext, ReactNode, useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // 1. Import useLocation
import { v4 as uuidv4 } from 'uuid';

// Define the shape of a single context entry
interface ContextEntry {
  id: string; // Unique ID for each open drawer
  config: any;
  viewConfig: any;
  editItem?: any;
}

interface NestedContextType {
  contextStack: ContextEntry[];
  openContext: (entry: Omit<ContextEntry, 'id'>) => string;
  closeContext: (id: string) => void;
}

const NestedContext = createContext<NestedContextType | undefined>(undefined);

export const useNestedContext = () => {
  const context = useContext(NestedContext);
  if (!context) {
    throw new Error('useNestedContext must be used within a NestedProvider');
  }
  return context;
};

export const NestedProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [contextStack, setContextStack] = useState<ContextEntry[]>([]);
  const location = useLocation(); // 2. Get the current location object

  // 3. Add an effect that listens for route changes
  useEffect(() => {
    // When the pathname changes, reset the context stack to an empty array.
    // This ensures no context "leaks" between top-level pages.
    setContextStack([]);
  }, [location.pathname]); // The effect runs only when the URL path changes

  const openContext = (entry: Omit<ContextEntry, 'id'>) => {
    const id = uuidv4();
    const newEntry = { ...entry, id };
    setContextStack((prev) => [...prev, newEntry]);
    return id; // Return the new ID so the component can track it
  };

  const closeContext = (id: string) => {
    setContextStack((prev) => prev.filter((entry) => entry.id !== id));
  };

  const value = useMemo(() => ({ contextStack, openContext, closeContext }), [contextStack]);

  return <NestedContext.Provider value={value}>{children}</NestedContext.Provider>;
};