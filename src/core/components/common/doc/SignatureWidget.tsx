import React, { useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Space, Typography, Spin, message, Button } from 'antd';
import { CloseCircleOutlined } from '@ant-design/icons';
import SignatureCanvas from 'react-signature-canvas';
import Publitio from 'publitio_js_sdk';

const { Text } = Typography;

// Publitio configuration - adjusted to use global environment variables if available
const publitio = new Publitio(
  import.meta.env.VITE_PUBLITIO_API_KEY || '', 
  import.meta.env.VITE_PUBLITIO_API_SECRET || ''
);

const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

interface SignatureWidgetProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export interface SignatureWidgetRef {
  upload: () => Promise<string | null>;
}

const SignatureWidget = forwardRef<SignatureWidgetRef, SignatureWidgetProps>(({ value, onChange, disabled }, ref) => {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    upload: async () => {
      if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
        if (value && !value.startsWith('data:')) {
          return value;
        }
        return null;
      }

      setIsLoading(true);
      try {
        const dataURL = sigCanvasRef.current.toDataURL();
        const signatureFile = dataURLtoFile(dataURL, `signature_${Date.now()}.png`);
        const response = await publitio.uploadFile(signatureFile);

        if (response && response.url_preview) {
          onChange?.(response.url_preview);
          return response.url_preview;
        } else {
          message.error('Failed to upload signature. Invalid response.');
          return null;
        }
      } catch (error) {
        message.error('Failed to upload signature.');
        console.error('Error uploading signature:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
  }));

  const handleDrawingEnd = useCallback(() => {
    if (sigCanvasRef.current) {
      setIsEmpty(sigCanvasRef.current.isEmpty());
      if (!sigCanvasRef.current.isEmpty()) {
        onChange?.(sigCanvasRef.current.toDataURL());
      }
    }
  }, [onChange]);

  const handleClear = useCallback(() => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      setIsEmpty(true);
      onChange?.('');
    }
  }, [onChange]);

  if (value && !value.startsWith('data:')) {
    return (
      <div style={{ position: 'relative' }}>
        <img
          src={value}
          alt="Signature"
          style={{
            border: '1px solid #d9d9d9',
            borderRadius: 6,
            maxWidth: '100%',
            maxHeight: 150,
          }}
        />
      </div>
    );
  }

  return (
    <Spin spinning={isLoading}>
      <div className="signature-canvas">
        <div
          style={{
            position: 'relative',
            border: '2px dashed #d9d9d9',
            borderRadius: 6,
            padding: 8,
            background: '#fafafa',
            width: '100%',
          }}
        >
          <SignatureCanvas
            ref={sigCanvasRef}
            penColor="black"
            canvasProps={{
              height: 150,
              style: {
                border: '1px solid #e8e8e8',
                borderRadius: 4,
                background: 'white',
                width: '100%',
              },
            }}
            onEnd={handleDrawingEnd}
            onBegin={() => setIsEmpty(false)}
          />
          {!disabled && (
            <Button
              type="text"
              icon={<CloseCircleOutlined />}
              size="large"
              onClick={handleClear}
              disabled={isEmpty || isLoading}
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                zIndex: 1,
              }}
            />
          )}
        </div>
      </div>
    </Spin>
  );
});

export default SignatureWidget;