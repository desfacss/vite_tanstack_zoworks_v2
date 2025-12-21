import { forwardRef, useImperativeHandle } from 'react';

export interface ImageUploaderProps {
    onUploadComplete?: (files: any[]) => void | Promise<void>;
    autoUpload?: boolean;
}

const ImageUploader = forwardRef<any, ImageUploaderProps>((props, ref) => {
    const { onUploadComplete: _onUploadComplete, autoUpload: _autoUpload } = props;

    useImperativeHandle(ref, () => ({
        triggerUpload: async () => {
            console.log('Stub: triggering upload');
            return [];
        }
    }));

    return <div>Image Uploader Stub</div>;
});

ImageUploader.displayName = 'ImageUploader';

export default ImageUploader;
