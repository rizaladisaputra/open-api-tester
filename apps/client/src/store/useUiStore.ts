import { create } from 'zustand';

type ActivePanel = 'home' | 'designer' | 'converter' | 'components' | 'security' | 'preview';
type EditorMode = 'visual' | 'yaml' | 'json';

interface UiStore {
  activePanel: ActivePanel;
  editorMode: EditorMode;
  darkMode: boolean;
  sidebarCollapsed: boolean;
  rightPanelCollapsed: boolean;
  isConverterMode: boolean;
  converterDirection: 'json-to-swagger' | 'swagger-to-json';
  showValidationPanel: boolean;
  isSaving: boolean;
  testActiveServer: string;
  testAuthToken: string;
  endpointTestUrls: Record<string, string>;

  setActivePanel: (p: ActivePanel) => void;
  setEditorMode: (m: EditorMode) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setConverterMode: (v: boolean) => void;
  setConverterDirection: (d: UiStore['converterDirection']) => void;
  setShowValidation: (v: boolean) => void;
  setIsSaving: (v: boolean) => void;
  setTestActiveServer: (s: string) => void;
  setTestAuthToken: (t: string) => void;
  setEndpointTestUrl: (id: string, url: string) => void;
}

export const useUiStore = create<UiStore>()((set) => ({
  activePanel: 'home',
  editorMode: 'visual',
  darkMode: true,
  sidebarCollapsed: false,
  rightPanelCollapsed: true,
  isConverterMode: false,
  converterDirection: 'json-to-swagger',
  showValidationPanel: false,
  isSaving: false,
  testActiveServer: '',
  testAuthToken: '',
  endpointTestUrls: {},

  setActivePanel: (p) => set({ activePanel: p }),
  setEditorMode: (m) => set({ editorMode: m }),
  toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  toggleRightPanel: () => set((s) => ({ rightPanelCollapsed: !s.rightPanelCollapsed })),
  setConverterMode: (v) => set({ isConverterMode: v }),
  setConverterDirection: (d) => set({ converterDirection: d }),
  setShowValidation: (v) => set({ showValidationPanel: v }),
  setIsSaving: (v) => set({ isSaving: v }),
  setTestActiveServer: (s) => set({ testActiveServer: s }),
  setTestAuthToken: (t) => set({ testAuthToken: t }),
  setEndpointTestUrl: (id, url) => set((s) => ({ endpointTestUrls: { ...s.endpointTestUrls, [id]: url } })),
}));
