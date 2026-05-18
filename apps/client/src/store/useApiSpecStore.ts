import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  ApiSpec, Endpoint, ApiTag, SchemaComponent, SecurityScheme,
} from '@modern-api-studio/types';
import { supabase } from '../lib/supabase';

const DEFAULT_SPEC: ApiSpec = {
  id: uuidv4(),
  info: { title: 'My API', version: '1.0.0', description: 'Built with Modern API Studio' },
  servers: [{ url: 'https://api.example.com', description: 'Production' }],
  tags: [
    { id: uuidv4(), name: 'Users', description: 'User operations' },
    { id: uuidv4(), name: 'Products', description: 'Product operations' },
  ],
  endpoints: [
    {
      id: uuidv4(),
      path: '/api/v1/users',
      method: 'GET',
      summary: 'List all users',
      description: 'Returns a paginated list of users',
      operationId: 'listUsers',
      tags: ['Users'],
      deprecated: false,
      security: ['bearerAuth'],
      parameters: [
        { id: uuidv4(), name: 'page', in: 'query', required: false, description: 'Page number', schema: { type: 'integer', example: 1 } },
        { id: uuidv4(), name: 'limit', in: 'query', required: false, description: 'Items per page', schema: { type: 'integer', example: 10 } },
      ],
      responses: [
        { id: uuidv4(), statusCode: '200', description: 'Success', schema: [] },
        { id: uuidv4(), statusCode: '401', description: 'Unauthorized', schema: [] },
      ],
    },
    {
      id: uuidv4(),
      path: '/api/v1/users',
      method: 'POST',
      summary: 'Create user',
      operationId: 'createUser',
      tags: ['Users'],
      deprecated: false,
      security: ['bearerAuth'],
      parameters: [],
      requestBody: {
        required: true,
        contentType: 'application/json',
        schema: [
          { id: uuidv4(), name: 'name', type: 'string', required: true, nullable: false, example: 'John Doe' },
          { id: uuidv4(), name: 'email', type: 'string', required: true, nullable: false, example: 'john@example.com', format: 'email' },
          { id: uuidv4(), name: 'password', type: 'string', required: true, nullable: false, format: 'password' },
        ],
      },
      responses: [
        { id: uuidv4(), statusCode: '201', description: 'Created', schema: [] },
        { id: uuidv4(), statusCode: '400', description: 'Bad Request', schema: [] },
      ],
    },
    {
      id: uuidv4(),
      path: '/api/v1/users/{id}',
      method: 'GET',
      summary: 'Get user by ID',
      operationId: 'getUserById',
      tags: ['Users'],
      deprecated: false,
      security: ['bearerAuth'],
      parameters: [
        { id: uuidv4(), name: 'id', in: 'path', required: true, description: 'User ID', schema: { type: 'string', format: 'uuid' } },
      ],
      responses: [
        { id: uuidv4(), statusCode: '200', description: 'Success', schema: [] },
        { id: uuidv4(), statusCode: '404', description: 'Not Found', schema: [] },
      ],
    },
  ],
  components: {
    schemas: [
      {
        id: uuidv4(),
        name: 'User',
        description: 'User entity',
        properties: [
          { id: uuidv4(), name: 'id', type: 'string', required: true, nullable: false, format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
          { id: uuidv4(), name: 'name', type: 'string', required: true, nullable: false, example: 'John Doe' },
          { id: uuidv4(), name: 'email', type: 'string', required: true, nullable: false, format: 'email', example: 'john@example.com' },
          { id: uuidv4(), name: 'createdAt', type: 'string', required: false, nullable: false, format: 'date-time' },
        ],
      },
    ],
    securitySchemes: [
      { id: uuidv4(), name: 'bearerAuth', type: 'bearer', description: 'JWT Bearer token', bearerFormat: 'JWT' },
      { id: uuidv4(), name: 'apiKeyAuth', type: 'apiKey', description: 'API Key', in: 'header', keyName: 'x-api-key' },
    ],
  },
  globalSecurity: ['bearerAuth'],
  openApiVersion: 'openapi3',
};

interface HistoryEntry {
  spec: ApiSpec;
  timestamp: number;
}

interface ApiSpecStore {
  spec: ApiSpec;
  activeEndpointId: string | null;
  history: HistoryEntry[];
  historyIndex: number;
  searchQuery: string;
  filterTag: string | null;
  activeProjectId: string | null;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
  /** ISO timestamp of when the current project was last loaded/saved (server value). Used for optimistic locking. */
  localUpdatedAt: string | null;
  /** ISO timestamp when we last successfully saved to Supabase. */
  lastSavedAt: string | null;

  loadProjectFromSupabase: (id: string, role?: 'owner' | 'editor' | 'viewer') => Promise<void>;
  createNewProject: (name: string) => Promise<boolean>;
  saveProjectToSupabase: () => Promise<void>;
  deleteProject: (id: string) => Promise<boolean>;
  renameProject: (id: string, name: string) => Promise<boolean>;

  // Spec-level actions
  setSpec: (spec: ApiSpec) => void;
  updateInfo: (info: Partial<ApiSpec['info']>) => void;
  setOpenApiVersion: (v: ApiSpec['openApiVersion']) => void;
  setGlobalSecurity: (schemes: string[]) => void;

  // Endpoint actions
  setActiveEndpoint: (id: string | null) => void;
  addEndpoint: (ep?: Partial<Endpoint>) => void;
  updateEndpoint: (id: string, changes: Partial<Endpoint>) => void;
  duplicateEndpoint: (id: string) => void;
  deleteEndpoint: (id: string) => void;
  clearEndpoints: () => void;
  reorderEndpoints: (from: number, to: number) => void;

  // Tag actions
  addTag: (tag: Partial<ApiTag>) => void;
  updateTag: (id: string, changes: Partial<ApiTag>) => void;
  deleteTag: (id: string) => void;

  // Schema component actions
  addSchema: (s: Partial<SchemaComponent>) => void;
  updateSchema: (id: string, changes: Partial<SchemaComponent>) => void;
  deleteSchema: (id: string) => void;

  // Security scheme actions
  addSecurityScheme: (s: Partial<SecurityScheme>) => void;
  updateSecurityScheme: (id: string, changes: Partial<SecurityScheme>) => void;
  deleteSecurityScheme: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Search / filter
  setSearchQuery: (q: string) => void;
  setFilterTag: (tag: string | null) => void;

  // Import full spec
  importSpec: (spec: ApiSpec) => void;
  resetSpec: () => void;
}

const cloneSpec = (s: ApiSpec): ApiSpec => JSON.parse(JSON.stringify(s));

export const useApiSpecStore = create<ApiSpecStore>()(
  persist(
    (set, get) => ({
      spec: DEFAULT_SPEC,
      activeEndpointId: DEFAULT_SPEC.endpoints[0]?.id ?? null,
      activeProjectId: null,
      currentUserRole: null,
      localUpdatedAt: null,
      lastSavedAt: null,
      history: [],
      historyIndex: -1,
      searchQuery: '',
      filterTag: null,

      loadProjectFromSupabase: async (id: string, role: 'owner' | 'editor' | 'viewer' = 'owner') => {
        const { data, error } = await supabase
          .from('projects')
          .select('spec_data, updated_at')
          .eq('id', id)
          .single();

        if (error || !data) {
          const { toast } = await import('react-hot-toast');
          toast.error('Failed to load project');
          return;
        }

        const spec = data.spec_data as ApiSpec;
        get().pushHistory();
        set({
          spec,
          activeProjectId: id,
          currentUserRole: role,
          activeEndpointId: spec.endpoints[0]?.id ?? null,
          localUpdatedAt: (data as any).updated_at ?? null,
          lastSavedAt: (data as any).updated_at ?? null,
        });
      },

      createNewProject: async (name: string): Promise<boolean> => {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) {
          const { toast } = await import('react-hot-toast');
          toast.error('You must be logged in to create a project');
          return false;
        }

        const newSpec: ApiSpec = {
          ...DEFAULT_SPEC,
          id: uuidv4(),
          info: { ...DEFAULT_SPEC.info, title: name },
        };

        const { data, error } = await supabase
          .from('projects')
          .insert({
            user_id: userData.user.id,
            name,
            spec_data: newSpec,
          })
          .select('id')
          .single();

        if (error) {
          console.error('[createNewProject] Supabase error:', error.message, error.details ?? '', error.hint ?? '');
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to create project: ${error.message}`);
          return false;
        }
        if (!data) {
          const { toast } = await import('react-hot-toast');
          toast.error('Failed to create project: no data returned');
          return false;
        }

        get().pushHistory();
        set({
          spec: newSpec,
          activeProjectId: data.id,
          currentUserRole: 'owner',
          activeEndpointId: newSpec.endpoints[0]?.id ?? null,
        });
        return true;
      },

      saveProjectToSupabase: async () => {
        const { spec, activeProjectId, localUpdatedAt } = get();
        if (!activeProjectId) return;

        // ── Optimistic locking: check if someone else saved since we loaded ──
        const { data: current, error: checkErr } = await supabase
          .from('projects')
          .select('updated_at')
          .eq('id', activeProjectId)
          .single();

        if (checkErr) {
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to save: ${checkErr.message}`);
          return;
        }

        const serverUpdatedAt: string | null = (current as any)?.updated_at ?? null;

        // Timestamps from Supabase may include sub-second precision; normalise to seconds.
        const toSec = (ts: string | null) => ts ? ts.slice(0, 19) : null;
        if (localUpdatedAt && serverUpdatedAt && toSec(serverUpdatedAt) !== toSec(localUpdatedAt)) {
          // Conflict — caller (Header) will catch this and show the dialog.
          const err = new Error('SAVE_CONFLICT');
          (err as any).serverUpdatedAt = serverUpdatedAt;
          throw err;
        }

        // ── Proceed with save ─────────────────────────────────────────────────
        const { error } = await supabase
          .from('projects')
          .update({ spec_data: spec, name: spec.info.title })
          .eq('id', activeProjectId);

        if (error) {
          console.error('[saveProjectToSupabase] Supabase error:', error.message, error.details ?? '', error.hint ?? '');
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to save project: ${error.message}`);
          return;
        }

        // ── Update localUpdatedAt so subsequent saves don't false-alarm ───────
        const { data: saved } = await supabase
          .from('projects')
          .select('updated_at')
          .eq('id', activeProjectId)
          .single();
        const newTs: string | null = (saved as any)?.updated_at ?? null;
        set({ localUpdatedAt: newTs, lastSavedAt: newTs ?? new Date().toISOString() });

        // Notify collaborators via Realtime broadcast
        const { data: userData } = await supabase.auth.getUser();
        const { useCollabStore } = await import('./useCollabStore');
        useCollabStore.getState().broadcastSave(userData.user?.email ?? 'A collaborator');
      },

      deleteProject: async (id: string): Promise<boolean> => {
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[deleteProject] Supabase error:', error.message, error.details ?? '', error.hint ?? '');
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to delete project: ${error.message}`);
          return false;
        }

        // If the deleted project was currently active, reset state
        if (get().activeProjectId === id) {
          set({ activeProjectId: null, currentUserRole: null });
        }
        return true;
      },

      renameProject: async (id: string, name: string): Promise<boolean> => {
        const trimmed = name.trim();
        if (!trimmed) return false;

        const { error } = await supabase
          .from('projects')
          .update({ name: trimmed })
          .eq('id', id);

        if (error) {
          console.error('[renameProject] Supabase error:', error.message, error.details ?? '', error.hint ?? '');
          const { toast } = await import('react-hot-toast');
          toast.error(`Failed to rename project: ${error.message}`);
          return false;
        }

        // Keep spec.info.title in sync if this is the currently active project
        if (get().activeProjectId === id) {
          set((s) => ({ spec: { ...s.spec, info: { ...s.spec.info, title: trimmed } } }));
        }
        return true;
      },

      pushHistory: () => {
        const { spec, history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ spec: cloneSpec(spec), timestamp: Date.now() });
        if (newHistory.length > 50) newHistory.shift();
        set({ history: newHistory, historyIndex: newHistory.length - 1 });
      },

      setSpec: (spec) => {
        get().pushHistory();
        set({ spec });
      },

      updateInfo: (info) => {
        get().pushHistory();
        set((s) => ({ spec: { ...s.spec, info: { ...s.spec.info, ...info } } }));
      },

      setOpenApiVersion: (v) => set((s) => ({ spec: { ...s.spec, openApiVersion: v } })),
      setGlobalSecurity: (schemes) => set((s) => ({ spec: { ...s.spec, globalSecurity: schemes } })),

      setActiveEndpoint: (id) => set({ activeEndpointId: id }),

      addEndpoint: (ep = {}) => {
        get().pushHistory();
        const state = get();
        const activeEp = state.spec.endpoints.find((e) => e.id === state.activeEndpointId);
        const defaultTags = activeEp?.tags.length ? activeEp.tags : (state.filterTag ? [state.filterTag] : []);
        
        const newEp: Endpoint = {
          id: uuidv4(),
          path: '/api/v1/new-endpoint',
          method: 'GET',
          summary: 'New Endpoint',
          tags: defaultTags,
          deprecated: false,
          parameters: [],
          responses: [{ id: uuidv4(), statusCode: '200', description: 'Success', schema: [] }],
          ...ep,
        };
        set((s) => ({
          spec: { ...s.spec, endpoints: [...s.spec.endpoints, newEp] },
          activeEndpointId: newEp.id,
        }));
      },

      updateEndpoint: (id, changes) => {
        set((s) => ({
          spec: {
            ...s.spec,
            endpoints: s.spec.endpoints.map((e) => (e.id === id ? { ...e, ...changes } : e)),
          },
        }));
      },

      duplicateEndpoint: (id) => {
        get().pushHistory();
        const ep = get().spec.endpoints.find((e) => e.id === id);
        if (!ep) return;
        const newEp = { ...cloneSpec(ep as unknown as ApiSpec) as unknown as Endpoint, id: uuidv4(), operationId: undefined };
        set((s) => ({
          spec: { ...s.spec, endpoints: [...s.spec.endpoints, newEp] },
          activeEndpointId: newEp.id,
        }));
      },

      deleteEndpoint: (id) => {
        get().pushHistory();
        set((s) => ({
          spec: { ...s.spec, endpoints: s.spec.endpoints.filter((e) => e.id !== id) },
          activeEndpointId: s.activeEndpointId === id ? null : s.activeEndpointId,
        }));
      },

      clearEndpoints: () => {
        get().pushHistory();
        set((s) => ({
          spec: { ...s.spec, endpoints: [] },
          activeEndpointId: null,
        }));
      },

      reorderEndpoints: (from, to) => {
        const eps = [...get().spec.endpoints];
        const [moved] = eps.splice(from, 1);
        eps.splice(to, 0, moved);
        set((s) => ({ spec: { ...s.spec, endpoints: eps } }));
      },

      addTag: (tag = {}) => {
        const newTag: ApiTag = { id: uuidv4(), name: 'New Tag', ...tag };
        set((s) => ({ spec: { ...s.spec, tags: [...s.spec.tags, newTag] } }));
      },

      updateTag: (id, changes) =>
        set((s) => ({ spec: { ...s.spec, tags: s.spec.tags.map((t) => (t.id === id ? { ...t, ...changes } : t)) } })),

      deleteTag: (id) =>
        set((s) => ({ spec: { ...s.spec, tags: s.spec.tags.filter((t) => t.id !== id) } })),

      addSchema: (schema = {}) => {
        const newSchema: SchemaComponent = { id: uuidv4(), name: 'NewSchema', properties: [], ...schema };
        set((s) => ({ spec: { ...s.spec, components: { ...s.spec.components, schemas: [...s.spec.components.schemas, newSchema] } } }));
      },

      updateSchema: (id, changes) =>
        set((s) => ({
          spec: {
            ...s.spec,
            components: {
              ...s.spec.components,
              schemas: s.spec.components.schemas.map((sc) => (sc.id === id ? { ...sc, ...changes } : sc)),
            },
          },
        })),

      deleteSchema: (id) =>
        set((s) => ({
          spec: {
            ...s.spec,
            components: {
              ...s.spec.components,
              schemas: s.spec.components.schemas.filter((sc) => sc.id !== id),
            },
          },
        })),

      addSecurityScheme: (scheme = {}) => {
        const s: SecurityScheme = { id: uuidv4(), name: 'newAuth', type: 'bearer', ...scheme };
        set((st) => ({
          spec: {
            ...st.spec,
            components: { ...st.spec.components, securitySchemes: [...st.spec.components.securitySchemes, s] },
          },
        }));
      },

      updateSecurityScheme: (id, changes) =>
        set((st) => ({
          spec: {
            ...st.spec,
            components: {
              ...st.spec.components,
              securitySchemes: st.spec.components.securitySchemes.map((ss) => (ss.id === id ? { ...ss, ...changes } : ss)),
            },
          },
        })),

      deleteSecurityScheme: (id) =>
        set((st) => ({
          spec: {
            ...st.spec,
            components: {
              ...st.spec.components,
              securitySchemes: st.spec.components.securitySchemes.filter((ss) => ss.id !== id),
            },
          },
        })),

      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex <= 0) return;
        const newIndex = historyIndex - 1;
        set({ spec: cloneSpec(history[newIndex].spec), historyIndex: newIndex });
      },

      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;
        const newIndex = historyIndex + 1;
        set({ spec: cloneSpec(history[newIndex].spec), historyIndex: newIndex });
      },

      setSearchQuery: (q) => set({ searchQuery: q }),
      setFilterTag: (tag) => set({ filterTag: tag }),

      importSpec: (spec) => {
        get().pushHistory();
        set({ spec, activeEndpointId: spec.endpoints[0]?.id ?? null });
      },

      resetSpec: () => {
        get().pushHistory();
        set({ spec: { ...DEFAULT_SPEC, id: uuidv4() }, activeEndpointId: DEFAULT_SPEC.endpoints[0]?.id ?? null });
      },
    }),
    {
      name: 'api-spec-store',
      version: 1,
      // Migrate persisted state between versions.
      // When bumping `version`, add a case here to transform the old shape.
      migrate: (persistedState: unknown, fromVersion: number): ApiSpecStore => {
        const s = persistedState as ApiSpecStore;
        // v0 → v1: no breaking changes
        if (fromVersion < 1) return s;
        return s;
      },
    }
  )
);
