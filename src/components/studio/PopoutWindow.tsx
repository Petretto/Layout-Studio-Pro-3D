import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface PopoutWindowProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  height?: number;
}

/**
 * Renders child components into an independent native browser window via React Portals.
 * Automatically synchronizes DOM styles and links from the parent document.
 * Adheres to Plan 6.7: Multimonitor readability for Process Flow, 2D CAD, and 3D Scene.
 */
export const PopoutWindow: React.FC<PopoutWindowProps> = ({
  title,
  onClose,
  children,
  width = 1280,
  height = 800,
}) => {
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const externalWindowRef = useRef<Window | null>(null);

  useEffect(() => {
    // Calculate centered popup coordinates
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    const win = window.open(
      '',
      '',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`
    );

    if (!win) {
      alert('Przeglądarka zablokowała wyskakujące okno. Zezwól na wyskakujące okienka dla tej witryny, aby korzystać z widoku wielomonitorowego.');
      onClose();
      return;
    }

    externalWindowRef.current = win;
    win.document.title = `${title} — Layout Studio Pro 3D`;

    // Copy all style sheets and style elements from parent window to ensure identical styling
    document.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      win.document.head.appendChild(node.cloneNode(true));
    });

    // Create wrapper container for React portal
    const container = win.document.createElement('div');
    container.className = 'popout-window-root';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    win.document.body.style.margin = '0';
    win.document.body.style.padding = '0';
    win.document.body.style.overflow = 'hidden';
    win.document.body.appendChild(container);

    setContainerEl(container);

    const handleBeforeUnload = () => {
      onClose();
    };

    win.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      win.removeEventListener('beforeunload', handleBeforeUnload);
      if (!win.closed) {
        win.close();
      }
      externalWindowRef.current = null;
    };
  }, [title, width, height, onClose]);

  if (!containerEl) return null;

  return createPortal(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          background: '#0f172a',
          color: '#f8fafc',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '13px',
          fontWeight: 600,
          borderBottom: '1px solid #334155',
          flexShrink: 0,
        }}
      >
        <span>⧉ {title}</span>
        <button
          onClick={onClose}
          style={{
            background: '#dc2626',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
          }}
          title="Przywróć widok do okna głównego"
        >
          ✕ Przywróć do okna głównego
        </button>
      </header>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>
    </div>,
    containerEl
  );
};
