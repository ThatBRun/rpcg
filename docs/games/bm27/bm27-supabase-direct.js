/* BM27 v2.7.27 — self-contained Supabase REST/Auth client.
   Removes the external Supabase JS CDN as a sign-in dependency.
   Uses only the public project URL + publishable key and the signed-in user's JWT. */
(() => {
  'use strict';
  const SESSION_KEY = 'bm27_direct_supabase_session_v1';
  const sessionMemory = new Map();
  const sessionStorageSafe = {
    get(key) {
      try { const v = localStorage.getItem(key); if (v != null) return v; } catch {}
      try { const v = sessionStorage.getItem(key); if (v != null) return v; } catch {}
      return sessionMemory.get(key) ?? null;
    },
    set(key, value) {
      const text = String(value);
      sessionMemory.set(key, text);
      try { localStorage.setItem(key, text); return; } catch {}
      try { sessionStorage.setItem(key, text); } catch {}
    },
    remove(key) {
      sessionMemory.delete(key);
      try { localStorage.removeItem(key); } catch {}
      try { sessionStorage.removeItem(key); } catch {}
    }
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const cleanUrl = value => String(value || '').trim().replace(/\/+$/, '');
  const jsonClone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function decodeJwt(token = '') {
    try {
      const part = String(token).split('.')[1];
      if (!part) return {};
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
      const text = decodeURIComponent(Array.prototype.map.call(atob(padded), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      return JSON.parse(text);
    } catch { return {}; }
  }

  function buildUserFromToken(token, fallback = null) {
    if (fallback?.id) return fallback;
    const p = decodeJwt(token);
    if (!p.sub) return fallback || null;
    return {
      id: p.sub,
      email: p.email || '',
      role: p.role || 'authenticated',
      user_metadata: p.user_metadata || p.raw_user_meta_data || {}
    };
  }

  function normalizeErrorPayload(payload, status, statusText) {
    const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || payload?.details || statusText || `Request failed (${status})`;
    const err = new Error(String(message));
    err.status = status;
    err.code = payload?.code || payload?.error_code || payload?.hint || '';
    err.details = payload?.details || '';
    err.payload = payload;
    return err;
  }

  function withAbort(ms = 12000) {
    if (typeof AbortController === 'undefined') return { signal: undefined, cancel() {} };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return { signal: controller.signal, cancel() { clearTimeout(timer); } };
  }

  function createClient(projectUrl, publishableKey) {
    const url = cleanUrl(projectUrl);
    const key = String(publishableKey || '').trim();
    let currentSession = null;
    const listeners = new Set();

    function remember(session) {
      currentSession = session || null;
      try {
        if (currentSession) sessionStorageSafe.set(SESSION_KEY, JSON.stringify(currentSession));
        else sessionStorageSafe.remove(SESSION_KEY);
      } catch {}
    }

    function emit(event, session) {
      for (const fn of [...listeners]) {
        try { fn(event, session); } catch (e) { console.warn('BM27 auth listener failed', e); }
      }
    }

    function normalizeSession(payload) {
      if (!payload) return null;
      const source = payload.session || payload;
      const access_token = source.access_token || payload.access_token;
      const refresh_token = source.refresh_token || payload.refresh_token;
      if (!access_token) return null;
      const jwt = decodeJwt(access_token);
      const expires_at = Number(source.expires_at || payload.expires_at || jwt.exp || 0) || 0;
      const expires_in = Number(source.expires_in || payload.expires_in || 0) || 0;
      return {
        access_token,
        refresh_token: refresh_token || '',
        token_type: source.token_type || payload.token_type || 'bearer',
        expires_in,
        expires_at: expires_at || (expires_in ? Math.floor(Date.now() / 1000) + expires_in : 0),
        user: source.user || payload.user || buildUserFromToken(access_token)
      };
    }

    async function raw(path, { method = 'GET', body, headers = {}, timeout = 12000, auth = true } = {}) {
      const abort = withAbort(timeout);
      const finalHeaders = {
        apikey: key,
        ...headers
      };
      const token = currentSession?.access_token;
      // Supabase publishable keys belong in the apikey header. Authorization is
      // reserved for the signed-in user's access-token JWT. Do not send an
      // sb_publishable_* key as a Bearer token during password auth.
      if (auth && token) finalHeaders.Authorization = `Bearer ${token}`;
      if (body !== undefined && !(body instanceof FormData)) finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
      try {
        const response = await fetch(`${url}${path}`, {
          method,
          headers: finalHeaders,
          body: body === undefined ? undefined : (body instanceof FormData ? body : JSON.stringify(body)),
          ...(abort.signal ? { signal: abort.signal } : {})
        });
        const text = await response.text();
        let payload = null;
        if (text) {
          try { payload = JSON.parse(text); } catch { payload = text; }
        }
        if (!response.ok) throw normalizeErrorPayload(typeof payload === 'object' ? payload : { message: payload }, response.status, response.statusText);
        return { response, payload };
      } catch (error) {
        if (error?.name === 'AbortError') {
          const e = new Error(`Cloud request timed out after ${Math.round(timeout / 1000)} seconds.`);
          e.code = 'BM27_TIMEOUT';
          throw e;
        }
        throw error;
      } finally { abort.cancel(); }
    }

    async function refreshIfNeeded(force = false) {
      if (!currentSession) return null;
      const now = Math.floor(Date.now() / 1000);
      if (!force && currentSession.expires_at && currentSession.expires_at > now + 45) return currentSession;
      if (!currentSession.refresh_token) return currentSession;
      const { payload } = await raw('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST', body: { refresh_token: currentSession.refresh_token }, auth: false, timeout: 10000
      });
      const session = normalizeSession(payload);
      if (!session) throw new Error('Could not refresh the BM27 account session.');
      remember(session);
      emit('TOKEN_REFRESHED', session);
      return session;
    }

    async function authedRaw(path, options = {}) {
      await refreshIfNeeded(false).catch(() => currentSession);
      try { return await raw(path, { ...options, auth: true }); }
      catch (error) {
        if (error?.status === 401 && currentSession?.refresh_token) {
          await refreshIfNeeded(true);
          return raw(path, { ...options, auth: true });
        }
        throw error;
      }
    }

    const auth = {
      async signInWithPassword({ email, password }) {
        try {
          const { payload } = await raw('/auth/v1/token?grant_type=password', {
            method: 'POST', body: { email, password }, auth: false, timeout: 10000
          });
          const session = normalizeSession(payload);
          if (!session) return { data: { session: null, user: null }, error: new Error('Supabase did not return an account session.') };
          remember(session);
          emit('SIGNED_IN', session);
          return { data: { session, user: session.user }, error: null };
        } catch (error) { return { data: { session: null, user: null }, error }; }
      },
      async signUp({ email, password, options = {} }) {
        try {
          const body = { email, password, data: options?.data || {} };
          const { payload } = await raw('/auth/v1/signup', { method: 'POST', body, auth: false, timeout: 10000 });
          const session = normalizeSession(payload);
          if (session) { remember(session); emit('SIGNED_IN', session); }
          return { data: { session, user: payload?.user || session?.user || null }, error: null };
        } catch (error) { return { data: { session: null, user: null }, error }; }
      },
      async setSession({ access_token, refresh_token }) {
        try {
          let session = normalizeSession({ access_token, refresh_token });
          if (!session) throw new Error('The account session was incomplete.');
          remember(session);
          // Fetch canonical user when possible, but do not make successful auth depend on it.
          try {
            const { payload } = await raw('/auth/v1/user', { method: 'GET', auth: true, timeout: 7000 });
            if (payload?.id) session.user = payload;
          } catch {}
          remember(session);
          emit('SIGNED_IN', session);
          return { data: { session, user: session.user }, error: null };
        } catch (error) { return { data: { session: null, user: null }, error }; }
      },
      async getSession() {
        try {
          if (!currentSession) {
            try { currentSession = normalizeSession(JSON.parse(sessionStorageSafe.get(SESSION_KEY) || 'null')); } catch {}
          }
          if (currentSession) await refreshIfNeeded(false).catch(() => null);
          return { data: { session: currentSession }, error: null };
        } catch (error) { return { data: { session: currentSession }, error }; }
      },
      async signOut() {
        const old = currentSession;
        try {
          if (old?.access_token) await raw('/auth/v1/logout', { method: 'POST', body: {}, auth: true, timeout: 6000 });
        } catch {}
        remember(null);
        emit('SIGNED_OUT', null);
        return { error: null };
      },
      onAuthStateChange(callback) {
        listeners.add(callback);
        return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
      }
    };

    function encodeFilterValue(value) {
      if (value == null) return 'null';
      return String(value).replace(/,/g, '\\,');
    }

    class QueryBuilder {
      constructor(table) {
        this.table = table;
        this.method = 'GET';
        this.operation = 'select';
        this.columns = '*';
        this.body = undefined;
        this.filters = [];
        this.orders = [];
        this.onConflict = '';
        this.wantRepresentation = false;
        this.singleMode = false;
      }
      select(columns = '*') { this.columns = columns || '*'; if (this.operation !== 'select') this.wantRepresentation = true; return this; }
      eq(field, value) { this.filters.push([field, `eq.${encodeFilterValue(value)}`]); return this; }
      order(field, { ascending = true } = {}) { this.orders.push(`${field}.${ascending ? 'asc' : 'desc'}`); return this; }
      maybeSingle() { this.singleMode = true; return this; }
      insert(values) { this.method = 'POST'; this.operation = 'insert'; this.body = values; return this; }
      upsert(values, { onConflict = '' } = {}) { this.method = 'POST'; this.operation = 'upsert'; this.body = values; this.onConflict = onConflict || ''; return this; }
      update(values) { this.method = 'PATCH'; this.operation = 'update'; this.body = values; return this; }
      delete() { this.method = 'DELETE'; this.operation = 'delete'; return this; }

      async execute() {
        try {
          const qs = new URLSearchParams();
          if (this.operation === 'select') qs.set('select', this.columns || '*');
          else if (this.wantRepresentation) qs.set('select', this.columns || '*');
          for (const [k, v] of this.filters) qs.append(k, v);
          if (this.orders.length) qs.set('order', this.orders.join(','));
          if (this.onConflict) qs.set('on_conflict', this.onConflict);
          const headers = {};
          if (this.operation === 'upsert') headers.Prefer = `resolution=merge-duplicates,${this.wantRepresentation ? 'return=representation' : 'return=minimal'}`;
          else if (this.operation === 'insert' || this.operation === 'update' || this.operation === 'delete') headers.Prefer = this.wantRepresentation ? 'return=representation' : 'return=minimal';
          const suffix = qs.toString() ? `?${qs.toString()}` : '';
          const { payload } = await authedRaw(`/rest/v1/${encodeURIComponent(this.table)}${suffix}`, {
            method: this.method,
            headers,
            body: this.body,
            timeout: 12000
          });
          let data = payload;
          if (this.operation !== 'select' && !this.wantRepresentation) data = null;
          if (this.singleMode) data = Array.isArray(data) ? (data[0] || null) : (data || null);
          return { data, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }
      then(resolve, reject) { return this.execute().then(resolve, reject); }
      catch(reject) { return this.execute().catch(reject); }
      finally(fn) { return this.execute().finally(fn); }
    }

    const client = {
      auth,
      from(table) { return new QueryBuilder(table); },
      __bm27Direct: true,
      __getSession: () => currentSession,
      __url: url
    };

    // Restore BM27's direct session first, then migrate an older supabase-js
    // session if one exists. This keeps already-signed-in players connected after
    // the emergency client switch.
    try { currentSession = normalizeSession(JSON.parse(sessionStorageSafe.get(SESSION_KEY) || 'null')); } catch {}
    if (!currentSession) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (!/^sb-.*-auth-token$/i.test(String(storageKey || ''))) continue;
          const parsed = JSON.parse(localStorage.getItem(storageKey) || 'null');
          const candidate = normalizeSession(parsed?.currentSession || parsed?.session || parsed);
          if (candidate?.access_token) { remember(candidate); break; }
        }
      } catch {}
    }
    return client;
  }

  window.BM27DirectSupabase = { createClient };
})();
