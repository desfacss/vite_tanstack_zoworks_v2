import { Steps, Card } from 'antd';
import { useESignWizardStore } from '../stores/esignStore';
import { UploadStep } from '../components/wizard/UploadStep';
import { RecipientsStep } from '../components/wizard/RecipientsStep';
import { EditorStep } from '../components/wizard/EditorStep';

export default function CreateEnvelope() {
    const { currentStep } = useESignWizardStore();

    const steps = [
        { title: 'Upload', content: <UploadStep /> },
        { title: 'Recipients', content: <RecipientsStep /> },
        { title: 'Editor', content: <EditorStep /> },
    ];

    return (
        <div className="p-4 w-full min-h-screen">
            <div className="mb-8">
                <h1 className="text-2xl font-bold mb-6">Create Transition Envelope</h1>
                <Steps
                    current={currentStep}
                    items={steps.map((s) => ({ title: s.title }))}
                    className="mb-8"
                />
            </div>

            <Card
                className="shadow-premium border-none rounded-2xl w-full"
                styles={{ body: { padding: '24px' } }}
            >
                {steps[currentStep].content}
            </Card>
        </div>
    );
}
