import React, { useMemo } from 'react';

interface GoogleDocViewerProps {
  /** The publicly shared Google Docs link */
  docLink: string;
  /** Height of the iframe container (default: '800px') */
  height?: string;
  /** Width of the iframe container (default: '100%') */
  width?: string;
}

const getEmbedUrl = (link: string): string | null => {
  if (!link || !link.startsWith('https://docs.google.com')) {
    return null;
  }

  const embedUrl = link.replace(/(\/edit|\/preview)?(\?.*)?$/, '/embed');

  if (embedUrl.includes('/document/d/') && embedUrl.endsWith('/embed')) {
    return embedUrl;
  }

  return null;
};

export default function GoogleDocViewer({
  docLink,
  height = '800px',
  width = '100%'
}: GoogleDocViewerProps): JSX.Element {

  const embedUrl = useMemo(() => getEmbedUrl(docLink), [docLink]);

  if (!docLink) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        ⚠️ Error: Please provide a `docLink` prop.
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        ⚠️ Error: Invalid Google Docs link provided.
      </div>
    );
  }

  return (
    <div style={{ width, height, border: '1px solid #ccc', overflow: 'hidden' }}>
      <iframe
        src={embedUrl}
        style={{
          border: 'none',
          width: '100%',
          height: '100%'
        }}
        title="Google Document Viewer"
        allowFullScreen
      />
    </div>
  );
}
