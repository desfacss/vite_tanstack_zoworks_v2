import React, { useMemo } from 'react';

// Define the component's props
interface GoogleDocViewerProps {
  /** The publicly shared Google Docs link (e.g., 'https://docs.google.com/document/d/1Bf.../edit?usp=sharing') */
  docLink: string;
  /** Height of the iframe container (default: '800px') */
  height?: string;
  /** Width of the iframe container (default: '100%') */
  width?: string;
}

/**
 * Converts a standard Google Docs sharing link into an embeddable URL.
 * * Standard Link Format: https://docs.google.com/document/d/<DOCUMENT_ID>/edit?usp=sharing
 * Embed URL Format:    https://docs.google.com/document/d/<DOCUMENT_ID>/embed
 * * @param link The original Google Docs sharing link.
 * @returns The embeddable URL or null if the link is invalid.
 */
const getEmbedUrl = (link: string): string | null => {
  if (!link || !link.startsWith('https://docs.google.com')) {
    return null;
  }
  
  // Use a regular expression to safely replace the end of the URL with '/embed'
  // This handles /edit, /preview, and other suffixes.
  const embedUrl = link.replace(/(\/edit|\/preview)?(\?.*)?$/, '/embed');

  // Basic check to ensure the replacement worked as expected
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
  
  // Use useMemo to calculate the embed URL only when docLink changes
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
        // sandbox="allow-same-origin allow-scripts" // Optional: Use a sandbox for security, but might break some functionality
      />
    </div>
  );
}