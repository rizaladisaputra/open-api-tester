import { useUiStore } from './store/useUiStore';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DesignerPanel } from './components/designer/DesignerPanel';
import { ApiInfoForm } from './components/designer/ApiInfoForm';
import { ConverterPanel } from './components/converter/ConverterPanel';
import { ComponentsPanel } from './components/components/ComponentsPanel';
import { SecurityPanel } from './components/security/SecurityPanel';
import { PreviewPanel } from './components/preview/PreviewPanel';

export default function App() {
  const { activePanel, sidebarCollapsed } = useUiStore();

  const renderPanel = () => {
    switch (activePanel) {
      case 'home':       return <div className="scroll-y" style={{ padding: 24, display: 'flex', justifyContent: 'center' }}><div style={{ width: '100%', maxWidth: 800 }}><ApiInfoForm /></div></div>;
      case 'designer':   return <DesignerPanel />;
      case 'converter':  return <ConverterPanel />;
      case 'components': return <ComponentsPanel />;
      case 'security':   return <SecurityPanel />;
      case 'preview':    return <PreviewPanel />;
      default:           return <DesignerPanel />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.2s ease' }}>
          {renderPanel()}
        </main>
      </div>
    </div>
  );
}
