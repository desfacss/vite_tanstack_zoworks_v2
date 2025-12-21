import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/core/lib/store';
import type { ViewType } from '../registry';

export const useViewState = (
  entityType: string,
  defaultView: ViewType,
  availableViews: ViewType[],
  viewKey: string
) => {
  // 1. Get the action from the store (stable reference)
  const setViewPreferences = useAuthStore(state => state.setViewPreferences);
  // **2. Select only the necessary preference value for comparison**
  const persistedViewType = useAuthStore(state => 
    state.viewPreferences[viewKey]?.viewType
  );
  // **3. Select the current user ID for the setViewPreferences action**
  const userId = useAuthStore(state => state.user?.id);

  // 4. Determine the initial state
  const [viewType, setViewType] = useState<ViewType>(() => {
    return availableViews?.length > 0 &&
      persistedViewType &&
      availableViews.includes(persistedViewType as ViewType)
      ? persistedViewType as ViewType
      : defaultView;
  });

  // 5. Use useEffect to save the state, ONLY depending on viewType and the stable key
  useEffect(() => {
    // Only proceed if we have a user ID and the current state differs from the persisted state
    if (userId && viewType && viewType !== persistedViewType) {
      // The setViewPreferences function in your store is:
      // setViewPreferences: (userId, entityType, prefs) => ...
      // But your hook calls it as:
      // setViewPreferences(viewKey, { ...entityPrefs, viewType });
      //
      // Assuming your store action SHOULD be: 
      // setViewPreferences: (entityKey, prefs) => { ... }
      // Or you need to pass the userId as the first argument, as per your store's definition:
      // setViewPreferences: (userId, entityType, prefs) => ...
      
      // Let's assume your store definition is correct and the first argument is userId (not viewKey)
      // *Your provided store code defines setViewPreferences as:*
      // setViewPreferences: (userId, entityType, prefs) => {}
      // *Your hook calls it as:*
      // setViewPreferences(viewKey, { ...entityPrefs, viewType });
      //
      // **There is a mismatch here.** Assuming `viewKey` is the correct entity key and you need to pass the actual `userId`:
      
      setViewPreferences(
        userId, // The actual user ID from the store
        viewKey, // The entity key/path
        { viewType } // The preference object
      );
      
      // If your store's function is meant to take the *entity key* instead of `userId` as the first arg, 
      // you must update the store definition or its usage throughout your app.
    }
  }, [viewType, persistedViewType, viewKey, userId, setViewPreferences]); 
  // setViewPreferences and userId are stable dependencies that don't cause a loop.

  // Use useCallback to ensure a stable function reference
  const updateViewType = useCallback((type: ViewType) => {
    if (availableViews?.includes(type)) {
      setViewType(type);
    }
  }, [availableViews]);

  return {
    viewType,
    setViewType: updateViewType,
  };
};