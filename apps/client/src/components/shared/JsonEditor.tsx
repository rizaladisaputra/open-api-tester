import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function JsonEditor({ value, onChange, placeholder, minHeight = 120 }: Props) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBeautify = () => {
    if (!value.trim()) return;
    try {
      const formatted = JSON.stringify(JSON.parse(value), null, 2);
      onChange(formatted);
      toast.success('JSON Beautified');
    } catch {
      toast.error('Invalid JSON format');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    if (isFullscreen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isFullscreen]);

  const containerStyle: React.CSSProperties = isFullscreen ? {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'var(--bg-surface)',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    padding: 24
  } : {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative'
  };

  return (
    <div style={containerStyle} onKeyDown={handleKeyDown}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 6 }}>
        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)' }} onClick={handleBeautify}>✨ Beautify</button>
        <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11, color: 'var(--text-muted)' }} onClick={() => setIsFullscreen(!isFullscreen)}>
          {isFullscreen ? '⤓ Exit Fullscreen' : '⤢ Fullscreen'}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="input input-mono"
        style={{ 
          flex: 1, 
          minHeight: isFullscreen ? 'auto' : minHeight, 
          fontSize: 12, 
          resize: isFullscreen ? 'none' : 'vertical',
          padding: 12,
          lineHeight: 1.5
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
