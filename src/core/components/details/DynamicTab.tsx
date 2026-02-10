// // import React from 'react';
// // import DynamicViews from '../DynamicViews';
// // // import DynamicViews from '../DynamicViews';

// // interface DynamicTabProps {
// //   entityType: string;
// //   viewConfig?: ViewConfig;
// //   editItem?: Record<string, any>;
// //   fetchFilters?: Array<{ column: string; value: any }>;
// //   tabs?: any;
// // }

// // const DynamicTab: React.FC<DynamicTabProps> = ({
// //   entityType,
// //   entitySchema,
// //   viewConfig,
// //   editItem,
// //   fetchFilters,
// //   tabs,
// //   details_overview
// // }) => {
// //   console.log('ddd2',fetchFilters);

// //   return (
// //     <div>
// //       <DynamicViews 
// //       // tabOptions={tabOptions}
// //         availableViews={['tableview', 'gridview']}
// //         defaultView={'tableview'}
// //       entityType={entityType}
// //       entitySchema={entitySchema}
// //        tabOptions={fetchFilters}
// //       //  defaultFilters={fetchFilters}
// //       //  tabs={tabs} 
// //       details_overview={details_overview}
// //       />
// //     </div>
// //   );
// // };

// // export default DynamicTab;



// // src/components/common/details/DynamicTab.tsx

// import React from 'react';
// import DynamicViews from '../DynamicViews';

// interface DynamicTabProps {
//   entityType: string;
//   entitySchema?: string;
//   details_overview?: boolean;
//   defaultFilters?: Record<string, any>;
//   tabOptions?: any[];
// }

// const DynamicTab: React.FC<DynamicTabProps> = (props) => {
//   // This component acts as a simple wrapper.
//   // It passes all received props directly to the DynamicViews component.
//   return (
//     <div>
//       <DynamicViews {...props} testing={false} />
//     </div>
//   );
// };

// export default DynamicTab;





// src/components/common/details/DynamicTab.tsx

import React from 'react';
import DynamicViews from '../DynamicViews';

/**
 * @interface DynamicTabProps
 * @description Defines the props accepted by the DynamicTab component.
 */
interface DynamicTabProps {
  /** The type of the entity to be displayed (e.g., 'user', 'product'). */
  entityType: string;

  /** The specific schema name for the entity, if different from entityType. Optional. */
  entitySchema?: string;

  /** A flag to indicate if the view is part of a larger detail page. Optional. */
  details_overview?: boolean;

  /** Default filters to apply to the view's data query. Optional. */
  defaultFilters?: Record<string, any>;

  /** Configuration options for the tab itself. Optional. */
  tabOptions?: any[];

  /**
   * The full data record of the parent entity. This is the key addition.
   * It provides context to the tab, allowing it to display data related to its parent.
   * For example, showing a user's 'orders' in a tab on that user's detail page. Optional.
   */
  parentRecord?: Record<string, any>;
}

/**
 * @component DynamicTab
 * @description A wrapper component designed to render a dynamic view within a tabbed interface.
 * It primarily acts as a passthrough, forwarding its props to the more complex DynamicViews component,
 * which handles the actual data fetching and rendering logic.
 *
 * @param {DynamicTabProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered DynamicViews component.
 */
const DynamicTab: React.FC<DynamicTabProps> = (props) => {
  // This component is a simple wrapper.
  // It passes all received props directly to the DynamicViews component using the spread operator {...props}.
  // This is an efficient pattern for creating specialized wrappers without re-declaring every prop.
  // It also injects a static `testing={false}` prop, likely to control a specific mode in DynamicViews.
  return (
    <div>
      <DynamicViews {...props} testing={false} />
    </div>
  );
};

export default DynamicTab;