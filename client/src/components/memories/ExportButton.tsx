import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '../common';
import { STRINGS } from '../../constants/strings';

/**
 * Export button that triggers a .zip download of all memories
 * Uses an anchor click with cookie auth (session cookie sent automatically)
 */
export function ExportButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/memories/export', {
        credentials: 'include',
      });
      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent('session-expired'));
        return;
      }
      if (!response.ok) {
        throw new Error('Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Before We Were Three.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download keepsake. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="primary"
      onClick={handleExport}
      disabled={isLoading}
      className="export-button"
    >
      <Download size={18} />
      <span>{isLoading ? STRINGS.MEMORIES_EXPORT_LOADING : STRINGS.MEMORIES_EXPORT_BUTTON}</span>
    </Button>
  );
}
