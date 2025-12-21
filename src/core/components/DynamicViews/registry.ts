// components/DynamicViews/registry.ts
import { lazy } from 'react';

export const viewRegistry = {
  tableview: lazy(() => import('./TableView')),
  dashboardview: lazy(() => import('./DashboardView')),
  // dashboarview: lazy(() => import('./DashboardPage')),
  // dashboarview: lazy(() => import('./DashboardEditor')),
  gridview: lazy(() => import('./GridView')),
  kanbanview: lazy(() => import('./KanbanView')),
  ganttview: lazy(() => import('./GanttChart')),
  // calendarview: lazy(() => import('./CalendarView')),
  calendarview: lazy(() => import('./calendar/MobileCalendarView')),
  mapview: lazy(() => import('./MapViewComponent'))
};

export type ViewType = keyof typeof viewRegistry;

export const isValidViewType = (type: string): type is ViewType => {
  return type in viewRegistry;
};

export const loadView = (viewType: string) => {
  console.log("viewType", viewType);
  if (!isValidViewType(viewType)) {
    console.log("viewType R", viewType);
    throw new Error(`Invalid view type: ${viewType}`);
  }
  return viewRegistry[viewType];
};