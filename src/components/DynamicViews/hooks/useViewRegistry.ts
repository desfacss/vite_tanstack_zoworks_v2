import { useQuery } from '@tanstack/react-query';
import { lazy } from 'react';

const viewRegistry = new Map<string, React.LazyExoticComponent<any>>();

export const useViewRegistry = () => {
  const registerView = (viewType: string, component: React.LazyExoticComponent<any>) => {
    viewRegistry.set(viewType, component);
  };

  const getView = (viewType: string) => {
    if (!viewRegistry.has(viewType)) {
      // Lazy load the view component
      // const ViewComponent = lazy(() => import(`../views/${viewType}View`));
      const ViewComponent = lazy(() => import(/* @vite-ignore */ `@/views/${viewType}View.tsx`));
      registerView(viewType, ViewComponent);
    }
    return viewRegistry.get(viewType);
  };

  return {
    registerView,
    getView
  };
};