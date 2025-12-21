// import React, { useState, useEffect } from 'react';
// import { message, Spin, Typography, Button } from 'antd';
// import { DocumentService } from './services/documentService';
// import { DocumentForm } from './types/document';
// import DocumentFormModal from './DocumentFormModal';
// import { useAuthStore } from '@/lib/store';
// import dayjs from 'dayjs';

// const { Title } = Typography;

// interface TaskReportPageProps {
//   editItem?: {
//     id: string;
//     ticket_id?: string;
//     account_id?: string;
//     assignee_id?: string;
//     name?: string;
//     account_id_name?: string;
//     [key: string]: any;
//   };
// }

// const TaskReportPage: React.FC<TaskReportPageProps> = ({ editItem }) => {
//   const { organization } = useAuthStore();
//   const [documentForm, setDocumentForm] = useState<DocumentForm | null>(null);
//   const [initialFormData, setInitialFormData] = useState<any | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [isModalVisible, setIsModalVisible] = useState(false);

//   const documentType = 'doc_service_reports';
//   const documentConfig = {
//     display_name: 'Service Report',
//   };

//   useEffect(() => {
//     if (!editItem?.id) {
//       setLoading(false);
//       message.error('No task ID provided to create service report.');
//       return;
//     }

//     const fetchData = async () => {
//       try {
//         const form = await DocumentService.getDocumentForm(documentType, organization?.id);
//         if (!form) {
//           message.error('Document form for Service Reports not found.');
//           setLoading(false);
//           return;
//         }
//         setDocumentForm(form);

//         // Map the entire editItem to initialFormData
//         const mappedData = {
//           ...editItem, // Pass the entire task row
//           taskId: editItem.id, // For explicit reference
//           ticketId: editItem.ticket_id,
//           clientId: editItem.account_id,
//           client_name: editItem.account_id_name,
//           assignee: editItem.assignee_id_name,
//           reportedDate: editItem.created_at ? dayjs(editItem.created_at) : null,
//         };
        
//         console.log('Initial form data mapped from editItem:', mappedData);
//         setInitialFormData(mappedData);

//       } catch (error) {
//         console.error('Error fetching data for service report:', error);
//         message.error('Failed to load initial data for the form.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [editItem, organization?.id, documentType]);

//   const handleClose = () => {
//     setIsModalVisible(false);
//   };

//   if (loading) {
//     return (
//       <div style={{ textAlign: 'center', padding: '40px' }}>
//         <Spin size="large" />
//         <p style={{ marginTop: 16 }}>Loading service report data...</p>
//       </div>
//     );
//   }

//   return (
//     <>
//       <Button
//         type="primary"
//         onClick={() => setIsModalVisible(true)}
//         disabled={!documentForm || !initialFormData}
//       >
//         Open Service Report Form
//       </Button>

//       {documentForm && initialFormData && (
//         <DocumentFormModal
//           visible={isModalVisible}
//           onClose={handleClose}
//           // The onSubmit prop is removed because the modal handles the submission internally.
//           documentForm={documentForm}
//           // initialData={initialFormData} // Pass the entire mapped data here
//           initialData={editItem} // Pass the entire mapped data here
//           mode="create"
//           title={`Create ${documentConfig.display_name}`}
//         />
//       )}
//     </>
//   );
// };

// export default TaskReportPage;




import React, { useState, useEffect } from 'react';
import { message, Spin, Typography, Button } from 'antd';
import { supabase } from '@/lib/supabase';
import { DocumentForm } from './types/document';
import DocumentFormModal from './DocumentFormModal';
import { useAuthStore } from '@/lib/store';
import dayjs from 'dayjs';

const { Title } = Typography;

interface TaskReportPageProps {
  editItem?: {
    id: string;
    ticket_id?: string;
    account_id?: string;
    assignee_id?: string;
    name?: string;
    account_id_name?: string;
    [key: string]: any;
  };
}

const TaskReportPage: React.FC<TaskReportPageProps> = ({ editItem }) => {
  const { organization } = useAuthStore();
  const [documentForm, setDocumentForm] = useState<DocumentForm | null>(null);
  const [initialFormData, setInitialFormData] = useState<any | null>(null);
  const [existingReport, setExistingReport] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');

  const documentType = 'doc_service_reports';
  const documentConfig = {
    display_name: 'Service Report',
  };

  useEffect(() => {
    if (!editItem?.id) {
      setLoading(false);
      message.error('No task ID provided to create/edit service report.');
      return;
    }

    const fetchData = async () => {
      try {
        const getDocumentForm = async (typeId: string, orgId?: string): Promise<DocumentForm | null> => {
          const { data, error } = await supabase
            .from('doc_forms')
            .select('*')
            .eq('type_id', typeId)
            .or(`organization_id.is.null,organization_id.eq.${orgId}`)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }
          return data;
        };

        const getServiceReportByTaskId = async (taskId: string, orgId?: string) => {
          const { data, error } = await supabase
            .from(documentType)
            .select('id, content, display_id')
            .eq('task_id', taskId)
            .eq('organization_id', orgId)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching existing service report:', error);
            throw error;
          }
          return data;
        };

        const prepopulateServiceReport = async (taskId: string) => {
          const { data, error } = await supabase.rpc('prepopulate_service_report', { p_task_id: taskId });
          if (error) {
            console.error('Error calling prepopulate_service_report RPC:', error);
            throw error;
          }
          console.log("ppp",data);
          // Handle case where RPC returns null or empty array
          return data || {};
        };

        // Step 1: Fetch the document form configuration
        const form = await getDocumentForm(documentType, organization?.id);
        if (!form) {
          message.error('Document form for Service Reports not found.');
          setLoading(false);
          return;
        }
        setDocumentForm(form);

        // Step 2: Check for an existing service report
        const existingDoc = await getServiceReportByTaskId(editItem.id, organization?.id);

        if (existingDoc) {
          // If a report exists, use its data and set mode to 'edit'
          setExistingReport(existingDoc);
          setMode('edit');
          setInitialFormData({
            ...existingDoc.content,
            id: existingDoc.id,
            doc_display_id: existingDoc.display_id,
            taskId: editItem.id,
          });
        } else {
          // If no report exists, call the RPC to pre-populate data
          setMode('create');
          const mappedData = await prepopulateServiceReport(editItem.id);

          // Fallback to default data if RPC returns no data
          const defaultData = {
            taskId: editItem.id,
            ticketId: editItem.ticket_id || '',
            clientId: editItem.account_id || '',
            client_name: editItem.account_id_name || '',
            assignee: editItem.assignee_id_name || '',
            reportedDate: editItem.created_at ? dayjs(editItem.created_at) : null,
          };

          setInitialFormData({ ...defaultData, ...mappedData });
          if (!mappedData || Object.keys(mappedData).length === 0) {
            message.warning('No pre-populated data available. Using default task data.');
          }
        }
      } catch (error) {
        console.error('Error in fetchData:', error);
        message.error('Failed to load initial data for the form.');
        // Set fallback data to allow button to be enabled
        setInitialFormData({
          taskId: editItem.id,
          ticketId: editItem.ticket_id || '',
          clientId: editItem.account_id || '',
          client_name: editItem.account_id_name || '',
          assignee: editItem.assignee_id_name || '',
          reportedDate: editItem.created_at ? dayjs(editItem.created_at) : null,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [editItem, organization?.id]);

  const handleClose = () => {
    setIsModalVisible(false);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16 }}>Loading service report data...</p>
      </div>
    );
  }

  return (
    <>
      <Button
        type={existingReport ? 'default' : 'primary'}
        onClick={() => setIsModalVisible(true)}
        disabled={!documentForm || !initialFormData}
      >
        {existingReport ? 'Edit Service Report' : 'Create Service Report'}
      </Button>

      {documentForm && initialFormData && (
        <DocumentFormModal
          visible={isModalVisible}
          onClose={handleClose}
          documentForm={documentForm}
          initialData={initialFormData}
          mode={mode}
          title={`${mode === 'create' ? 'Create' : 'Edit'} ${documentConfig.display_name}`}
        />
      )}
    </>
  );
};

export default TaskReportPage;