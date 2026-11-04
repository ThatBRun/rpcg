(() => {
  const cfg = window.MSHSAA_BM27_CONFIG || {};

  function normalizeSupabaseUrl(value = '') {
    const raw = String(value || '').trim();
    if (!raw) return '';
    try {
      const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      // Supabase client/auth calls must start at the project origin, never /auth/v1 or another path.
      return parsed.origin.replace(/\/$/, '');
    } catch {
      return raw.replace(/\/+$/, '').replace(/\/auth\/v1.*$/i, '');
    }
  }

  const PUBLIC_CONFIG_STORAGE_KEY = 'bm27_public_cloud_config_v1';
  let SUPABASE_URL = normalizeSupabaseUrl(cfg.SUPABASE_URL);
  let SUPABASE_KEY = String(cfg.SUPABASE_ANON_KEY || '').trim();
  const USERNAME_DOMAIN = String(cfg.USERNAME_DOMAIN || 'accounts.mshsaabbm27.com')
    .trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

  function publicConfigLooksValid(url = SUPABASE_URL, key = SUPABASE_KEY) {
    const normalized = normalizeSupabaseUrl(url);
    const value = String(key || '').trim();
    if (!normalized || !value) return false;
    if (/YOUR-PROJECT|PASTE_|example\.com/i.test(normalized)) return false;
    if (/YOUR-SUPABASE|PASTE_|service[_-]?role/i.test(value)) return false;
    try {
      const host = new URL(normalized).hostname;
      if (!host || /mshsaabbm27\.com$/i.test(host)) return false;
    } catch { return false; }
    return value.length >= 20;
  }

  let configured = publicConfigLooksValid();

  function applyPublicConfig(url, key, persist = true) {
    const normalized = normalizeSupabaseUrl(url);
    const cleanKey = String(key || '').trim();
    if (!publicConfigLooksValid(normalized, cleanKey)) return false;
    SUPABASE_URL = normalized;
    SUPABASE_KEY = cleanKey;
    cfg.SUPABASE_URL = normalized;
    cfg.SUPABASE_ANON_KEY = cleanKey;
    window.MSHSAA_BM27_CONFIG = cfg;
    configured = true;
    client = null;
    session = null;
    if (persist) {
      try {
        localStorage.setItem(PUBLIC_CONFIG_STORAGE_KEY, JSON.stringify({
          SUPABASE_URL: normalized, SUPABASE_ANON_KEY: cleanKey,
          USERNAME_DOMAIN, SCHOOL_SEASON: cfg.SCHOOL_SEASON || '2025-2026'
        }));
      } catch {}
    }
    return true;
  }

  function parsePublicConfigText(text = '') {
    const url = (String(text).match(/SUPABASE_URL\s*[:=]\s*["'](https?:\/\/[^"']+)["']/i) || [])[1];
    const key = (String(text).match(/SUPABASE_(?:ANON_)?KEY\s*[:=]\s*["']([^"']+)["']/i) || [])[1];
    return url && key ? { url, key } : null;
  }

  async function recoverPublicConfig() {
    if (configured) { applyPublicConfig(SUPABASE_URL, SUPABASE_KEY, true); return true; }
    try {
      const remembered = JSON.parse(localStorage.getItem(PUBLIC_CONFIG_STORAGE_KEY) || '{}');
      if (applyPublicConfig(remembered.SUPABASE_URL, remembered.SUPABASE_ANON_KEY, false)) return true;
    } catch {}

    // Full ZIP deployments used to overwrite config.js. Try older PWA caches before asking the player.
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        for (const name of names.reverse()) {
          const cache = await caches.open(name);
          const requests = await cache.keys();
          for (const request of requests) {
            if (!/\/config\.js(?:\?|$)/i.test(new URL(request.url).pathname + new URL(request.url).search)) continue;
            const response = await cache.match(request);
            if (!response) continue;
            const found = parsePublicConfigText(await response.clone().text());
            if (found && applyPublicConfig(found.url, found.key, true)) return true;
          }
        }
      }
    } catch (error) { console.warn('BM27 cloud config cache recovery skipped', error); }
    return configured;
  }

  let client = null;
  let session = null;
  let saveTimer = null;
  let saveInFlight = null;
  let pendingSave = null;
  let lastSavedAt = null;
  let retryTimer = null;
  let isAdmin = false;
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });

  const el = id => document.getElementById(id);
  const accountStatus = () => el('accountStatus');
  const usernameInput = () => el('accountUsername');
  const passwordInput = () => el('accountPassword');

  function normalizedUsername(value = '') {
    return value.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 24);
  }

  function usernameEmail(username, domain = USERNAME_DOMAIN) {
    return `${normalizedUsername(username)}@${String(domain || USERNAME_DOMAIN).trim().toLowerCase()}`;
  }

  function loginEmailCandidates(username) {
    // Current namespace first. Legacy namespaces remain sign-in compatible so updates do not strand accounts.
    const domains = [
      USERNAME_DOMAIN,
      'accounts.mshsaabbm27.com',
      'accounts.rampacegames.com',
      'mshsaabm27.app',
      'accounts.mshsaabm27.app'
    ];
    return [...new Set(domains.filter(Boolean))].map(domain => usernameEmail(username, domain));
  }

  function databaseSetupKind(error) {
    const code = String(error?.code || error?.payload?.code || '').toUpperCase();
    const raw = String(error?.message || error?.details || error?.hint || error?.error_description || '');
    if (code === '42501' || /permission denied for (table|schema)|insufficient privilege/i.test(raw)) return 'grant';
    if (code === '42P01' || code === 'PGRST205' || /could not find the table|relation .* does not exist/i.test(raw)) return 'missing';
    if (code === 'PGRST301' || /jwt.*(expired|invalid)|invalid jwt/i.test(raw)) return 'jwt';
    return '';
  }

  function databaseSetupMessage(error) {
    const kind = databaseSetupKind(error);
    if (kind === 'grant') return 'Supabase is online and your sign-in worked, but BM27 database tables are not exposed to signed-in users yet. Run SUPABASE-V2728-DATA-API-CONNECTION-REPAIR.sql once in Supabase SQL Editor.';
    if (kind === 'missing') return 'Supabase is online and your sign-in worked, but one or more BM27 database tables are missing. Run SUPABASE-V2728-DATA-API-CONNECTION-REPAIR.sql once in Supabase SQL Editor.';
    if (kind === 'jwt') return 'Supabase is online, but the saved account session is no longer valid. Sign out and sign in again.';
    return '';
  }

  function errorText(error, fallback = 'Something went wrong.') {
    if (!error) return fallback;
    if (typeof error === 'string') return error;
    const setup = databaseSetupMessage(error);
    if (setup) return setup;
    const text = error.message || error.error_description || error.msg || error.details || error.hint || error.code;
    if (text) {
      const value = String(text);
      if (/load failed|failed to fetch|network request failed|networkerror/i.test(value)) {
        return 'BM27 could not reach the Supabase account server. The request was stopped instead of hanging. Check your connection and try again.';
      }
      return value;
    }
    try { const json = JSON.stringify(error); if (json && json !== '{}') return json; } catch {}
    return fallback;
  }

  function showStatus(message, isError = false) {
    const node = accountStatus();
    if (!node) return;
    node.textContent = String(message || '');
    node.classList.toggle('error-text', isError);
  }

  function withTimeout(promise, ms = 10000, message = 'Cloud request timed out.') {
    let timer = null;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  function isConnectivityError(error) {
    const value = String(errorText(error, error?.message || error || '')).toLowerCase();
    return /timed out|load failed|failed to fetch|network|could not be reached|abort/.test(value);
  }


  function updateSaveIndicator(state, message) {
    const pill = el('saveStatusPill');
    const button = el('manualSaveBtn');
    if (pill) {
      pill.dataset.state = state;
      pill.textContent = message;
    }
    if (button) {
      button.disabled = false;
      button.classList.toggle('saving', false);
      button.textContent = 'Save Game';
    }
  }

  function setBusy(busy) {
    ['signUpBtn', 'signInBtn', 'signOutBtn'].forEach(id => {
      const node = el(id);
      if (node) node.disabled = busy;
    });
  }

  function ensureRepairButton() {
    const actions = document.querySelector('#signedOutControls .account-actions');
    if (!actions) return;
    let button = el('repairCloudBtn');
    if (!button) {
      button = document.createElement('button');
      button.id = 'repairCloudBtn';
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Repair Cloud Connection';
      button.addEventListener('click', async () => {
        const oldUrl = publicConfigLooksValid() ? SUPABASE_URL : '';
        const url = window.prompt('BM27 Cloud Repair — paste your Supabase Project URL (the public https://...supabase.co URL):', oldUrl);
        if (url == null) return;
        const key = window.prompt('Paste the Supabase publishable/anon key. Do NOT paste a service-role key:', '');
        if (key == null) return;
        if (!applyPublicConfig(url, key, true)) {
          showStatus('That cloud configuration is not valid. Use the Project URL and publishable/anon key from Supabase Project Settings → API.', true);
          return;
        }
        try {
          await ensureCloudClient();
          showStatus('Cloud connection repaired. You can sign in now.');
          updateAccountUI();
        } catch (error) {
          showStatus(`Cloud repair could not connect: ${errorText(error)}`, true);
        }
      });
      actions.appendChild(button);
    }
    button.classList.toggle('hidden', configured);
  }

  async function ensureCloudClient() {
    if (!configured) await recoverPublicConfig();
    if (!configured) return null;
    if (client) return client;
    // v2.7.26: use BM27's bundled direct Supabase client first. This removes the
    // external CDN as a login dependency and works even when jsDelivr is blocked,
    // slow, or unavailable on a school/home network.
    if (window.BM27DirectSupabase?.createClient) {
      client = window.BM27DirectSupabase.createClient(SUPABASE_URL, SUPABASE_KEY);
      return client;
    }
    // Compatibility fallback for older deployments that still bundle supabase-js.
    if (window.supabase?.createClient) {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      return client;
    }
    throw new Error('BM27 account client did not load. Hard-refresh the page and try again.');
  }

  async function requireCloudForAccount() {
    const c = await ensureCloudClient();
    if (c) return c;
    ensureRepairButton();
    showStatus('BM27 needs its cloud connection restored before account sign-in. Press Repair Cloud Connection.', true);
    throw new Error('Cloud connection needs repair.');
  }

  function updateAccountUI() {
    const signedIn = Boolean(session?.user);
    el('signedOutControls')?.classList.toggle('hidden', signedIn);
    el('signedInControls')?.classList.toggle('hidden', !signedIn);
    if (el('newSaveBtn')) el('newSaveBtn').disabled = configured && !signedIn;

    ensureRepairButton();
    if (!configured) {
      showStatus('Cloud connection needs repair. Your local careers are still safe.', true);
      if (el('newSaveBtn')) el('newSaveBtn').disabled = false;
    } else if (signedIn) {
      const username = session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Player';
      if (el('signedInName')) el('signedInName').textContent = username;
      showStatus('Connected. Your careers save automatically on every device.');
    } else {
      showStatus('Create an account or sign in to use the same saves on every device.');
    }
  }

  function compactSaveForCloud(save) {
    if (!save) return save;
    const schoolId = String(save.schoolId);
    // Strip AI rosters before cloning so cloud snapshots are much faster and smaller.
    const shell = {
      ...save,
      teams: Array.isArray(save.teams) ? save.teams.map(team => {
        if (String(team.id) === schoolId) return team;
        const compact = { ...team };
        delete compact.roster;
        compact.rosterSeed = compact.rosterSeed || `${save.id}:${save.season}:${team.id}`;
        return compact;
      }) : save.teams,
      cloudFormat: 3
    };
    return JSON.parse(JSON.stringify(shell));
  }

  function hydrateCloudSave(save) {
    if (!save || !Array.isArray(save.teams)) return save;
    const schoolId = String(save.schoolId);
    save.teams.forEach((team, index) => {
      if (String(team.id) === schoolId) return;
      if (!Array.isArray(team.roster) || !team.roster.length) {
        try {
          team.roster = Array.from({ length: 13 }, (_, playerIndex) => {
            const player = makePlayer(team, playerIndex, save.season || 2026);
            player.id = `ai-${team.id}-${save.season || 2026}-${playerIndex}`;
            return player;
          });
        } catch {
          team.roster = [];
        }
      }
      if (!Number.isFinite(Number(team.rating)) && team.roster.length) team.rating = teamRating(team.roster);
    });
    // Reapply verified public names for compacted AI rosters in Real Roster Mode.
    if (save.rosterMode === 'real' && typeof applyRealRosters === 'function') {
      try { applyRealRosters(save); } catch (error) { console.warn('Real roster hydration skipped', error); }
    }
    return save;
  }

  async function loadCloudSaves() {
    if (!client || !session?.user) return [];
    const { data, error } = await client
      .from('game_saves')
      .select('id, game_data, updated_at')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false });
    if (error) throw error;

    const cloudSaves = (data || []).map(row => {
      const game = hydrateCloudSave(row.game_data);
      if (game && isUuid(row.id)) game.id = row.id;
      return game;
    }).filter(Boolean);
    // v2.7.29: merge by freshness instead of blindly letting an older cloud copy
    // overwrite newer work from this device. Whichever copy has the newest updatedAt wins.
    let localSaves = [];
    try {
      const parsed = JSON.parse(localStorage.getItem('mshsaa_bm27_saves') || '[]');
      if (Array.isArray(parsed)) localSaves = parsed.map(x => window.BM27FastSave?.hydrateSave?.(x) || x);
    } catch {}
    const memorySaves = (typeof saves !== 'undefined' && Array.isArray(saves)) ? saves : [];
    const cloudById = new Map(cloudSaves.filter(Boolean).map(s => [String(s.id), s]));
    const localById = new Map();
    [...localSaves, ...memorySaves].forEach(s => {
      if (!s?.id) return;
      const id = String(s.id), prior = localById.get(id);
      const ts = Date.parse(s.updatedAt || s.createdAt || 0) || 0;
      const pts = Date.parse(prior?.updatedAt || prior?.createdAt || 0) || 0;
      if (!prior || ts >= pts) localById.set(id, s);
    });
    const ids = new Set([...localById.keys(), ...cloudById.keys()]);
    const newerLocal = [];
    const merged = [];
    for (const id of ids) {
      const local = localById.get(id), cloud = cloudById.get(id);
      if (!local) { merged.push(cloud); continue; }
      if (!cloud) { merged.push(local); newerLocal.push(local); continue; }
      const lt = Date.parse(local.updatedAt || local.createdAt || 0) || 0;
      const ct = Date.parse(cloud.updatedAt || cloud.createdAt || 0) || 0;
      if (lt > ct) { merged.push(local); newerLocal.push(local); }
      else merged.push(cloud);
    }
    saves = merged.filter(Boolean).sort((a,b)=>(Date.parse(b.updatedAt||b.createdAt||0)||0)-(Date.parse(a.updatedAt||a.createdAt||0)||0));
    // Keep a device-side recovery copy even while signed in. This prevents a temporary
    // auth/network problem from making the save picker look empty.
    window.BM27Storage?.set('mshsaa_bm27_saves', JSON.stringify((saves || []).map(x => window.BM27FastSave?.compactSave?.(x) || x)));
    // If this device contains the newer revision, quietly repair the account copy too.
    if (newerLocal.length) Promise.resolve().then(async()=>{
      for (const one of newerLocal) { try { await saveOne(one); } catch (e) { console.warn('BM27 newer local save will retry later', e); pendingSave = compactSaveForCloud(one); scheduleAutomaticRetry(3500); } }
    });
    return saves;
  }

  async function loadCloudSchools() {
    if (!client) return [];
    const { data, error } = await client
      .from('schools')
      .select('school_key,name,mascot,class,district,primary_color,secondary_color,city')
      .eq('season', cfg.SCHOOL_SEASON || '2025-2026')
      .order('name');
    if (error) {
      if (error.code === '42P01') return [];
      throw error;
    }
    if (!data?.length) return [];
    let schools = data.map(s => ({
      id: s.school_key,
      name: s.name,
      mascot: s.mascot || 'Athletics',
      class: String(s.class),
      district: String(s.district),
      primary: s.primary_color || '#1d4ed8',
      secondary: s.secondary_color || '#ffffff',
      city: s.city || ''
    }));
    if (typeof dedupeSchoolList === 'function') schools = dedupeSchoolList(schools);
    directory = schools;
    window.BM27Storage?.set('mshsaa_bm27_directory', JSON.stringify(schools));
    return schools;
  }

  async function saveSchoolsToServer(schools) {
    if (!client || !session?.user || !Array.isArray(schools) || !schools.length) return;
    if (typeof dedupeSchoolList === 'function') schools = dedupeSchoolList(schools);
    const rows = schools.map(s => ({
      season: cfg.SCHOOL_SEASON || '2025-2026',
      school_key: s.id,
      name: s.name,
      mascot: s.mascot || 'Athletics',
      class: Number(s.class),
      district: Number(s.district),
      primary_color: s.primary || '#1d4ed8',
      secondary_color: s.secondary || '#ffffff',
      city: s.city || '',
      updated_by: session.user.id,
      updated_at: new Date().toISOString()
    }));
    for (let i = 0; i < rows.length; i += 250) {
      const { error } = await client.from('schools').upsert(rows.slice(i, i + 250), {
        onConflict: 'season,school_key'
      });
      if (error) throw error;
    }
  }


  async function loadBrandingLogos() {
    if (!client || !session?.user) return {};
    try {
      const { data, error } = await client.from('user_branding').select('school_name,logo_data').eq('user_id', session.user.id);
      if (error) {
        // A deployment that has not added the optional table should keep local branding working.
        if (error.code === '42P01' || /user_branding/i.test(error.message||'')) return {};
        throw error;
      }
      const map = {};
      for (const row of data || []) if (row.school_name && row.logo_data) map[row.school_name] = row.logo_data;
      // v2.6.0: large logo payloads are cached by the branding module in IndexedDB,
      // not localStorage (which has a small per-origin quota).
      window.dispatchEvent(new CustomEvent('bm27-branding-cloud-loaded', { detail: map }));
      return map;
    } catch (error) {
      console.warn('Branding cloud load skipped', error);
      return {};
    }
  }

  async function saveBrandingLogo(schoolName, logoData) {
    if (!client || !session?.user) return { localOnly: true };
    const payload = { user_id: session.user.id, school_name: String(schoolName), logo_data: String(logoData), updated_at: new Date().toISOString() };
    // Update first, then insert. This is more tolerant of older Supabase schemas/policies
    // than relying on an UPSERT conflict target for every branding upload.
    const { data: updated, error: updateError } = await client.from('user_branding')
      .update({ logo_data: payload.logo_data, updated_at: payload.updated_at })
      .eq('user_id', session.user.id).eq('school_name', payload.school_name).select('school_name');
    if (updateError) throw updateError;
    if (!updated?.length) {
      const { error: insertError } = await client.from('user_branding').insert(payload);
      if (insertError) {
        // A simultaneous/device duplicate can race the insert. Retry as update once.
        if (insertError.code === '23505') {
          const { error: retryError } = await client.from('user_branding')
            .update({ logo_data: payload.logo_data, updated_at: payload.updated_at })
            .eq('user_id', session.user.id).eq('school_name', payload.school_name);
          if (retryError) throw retryError;
        } else throw insertError;
      }
    }
    return { localOnly: false };
  }

  async function deleteBrandingLogo(schoolName) {
    if (!client || !session?.user) return { localOnly: true };
    const { error } = await client.from('user_branding').delete().eq('user_id', session.user.id).eq('school_name', String(schoolName));
    if (error) throw error;
    return { localOnly: false };
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
  }

  function freshUuid() {
    try { if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID(); } catch {}
    const bytes = new Uint8Array(16);
    try { globalThis.crypto?.getRandomValues?.(bytes); } catch {}
    if (![...bytes].some(Boolean)) for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = [...bytes].map(b => b.toString(16).padStart(2, '0'));
    return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10,16).join('')}`;
  }

  function ensureCloudSaveUuid(save) {
    if (!save) return null;
    if (isUuid(save.id)) return save.id;
    const previousId = save.id;
    const replacementId = freshUuid();
    save.id = replacementId;
    // Preserve the old local identifier only for diagnostics/migration. It is not sent as the DB primary key.
    save.migrations = save.migrations || {};
    save.migrations.replacedInvalidSaveId = { from: String(previousId || ''), to: replacementId, at: new Date().toISOString() };
    // The save object is held by reference inside `saves`, so changing it here also repairs the launcher copy.
    console.warn('BM27 repaired invalid cloud save UUID', previousId, '→', replacementId);
    return replacementId;
  }

  async function saveOne(save) {
    if (!save) throw new Error('This career does not exist.');
    ensureCloudSaveUuid(save);
    if (!client || !session?.user) {
      lastSavedAt = new Date();
      updateSaveIndicator('local', '✓ Saved');
      return { localOnly: true };
    }
    const snapshot = save.cloudFormat >= 3 ? save : compactSaveForCloud(save);
    const team = snapshot.teams?.find(t => String(t.id) === String(snapshot.schoolId));
    const operation = async () => {
      const payload = {
        id: snapshot.id,
        user_id: session.user.id,
        save_name: snapshot.name || 'Career',
        school_name: team?.name || null,
        season: snapshot.season || 2026,
        game_data: snapshot,
        updated_at: new Date().toISOString()
      };
      // Ask PostgREST to return the row in the same request. BM27 only marks the
      // account copy Saved after Supabase actually acknowledges this career id.
      const request = client.from('game_saves').upsert(payload, { onConflict: 'id' }).select('id,updated_at').maybeSingle();
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Cloud save timed out. Your device save is still safe.')), 12000));
      let result;
      try {
        result = await Promise.race([request, timeout]);
      } catch (networkError) {
        throw networkError;
      }
      if (result?.error) {
        // Compatibility fallback for older schemas with a user/save-name unique constraint.
        if (result.error.code === '23505') {
          const fallback = await client.from('game_saves')
            .update({ ...payload, id: undefined })
            .eq('user_id', session.user.id)
            .eq('save_name', payload.save_name)
            .select('id,updated_at').maybeSingle();
          if (fallback.error) throw fallback.error;
          if (!fallback.data?.id) throw new Error('Supabase did not acknowledge the updated career. Your device copy is still safe.');
        } else throw result.error;
      } else if (!result?.data?.id) {
        throw new Error('Supabase did not acknowledge the saved career. Your device copy is still safe.');
      }
      lastSavedAt = new Date();
      clearTimeout(retryTimer); retryTimer = null;
      updateSaveIndicator('saved', '✓ Saved');
      return { localOnly: false };
    };
    while (saveInFlight) await saveInFlight.catch(() => {});
    saveInFlight = operation();
    try { return await saveInFlight; }
    finally { saveInFlight = null; }
  }

  function scheduleAutomaticRetry(delay = 4000) {
    clearTimeout(retryTimer);
    if (!pendingSave || !session?.user) return;
    retryTimer = setTimeout(() => {
      if (!pendingSave || !session?.user) return;
      schedulePendingCloudSave(0);
    }, delay);
  }

  function schedulePendingCloudSave(delay = 150) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      if (!pendingSave) return;
      if (saveInFlight) { schedulePendingCloudSave(250); return; }
      const snapshot = pendingSave;
      pendingSave = null;
      try {
        await saveOne(snapshot);
        showStatus('Saved.');
      } catch (error) {
        console.error('Autosave failed', error);
        // Keep the latest failed snapshot queued for the next autosave/manual save instead of losing it.
        pendingSave = pendingSave || snapshot;
        updateSaveIndicator('error', '✓ Saved • retrying automatically');
        showStatus(`Save connection interrupted: ${errorText(error)}. BM27 is retrying automatically.`, true);
        scheduleAutomaticRetry();
      }
    }, delay);
  }

  function queueCurrentSave(save) {
    if (!save) return;
    if (!session?.user) {
      updateSaveIndicator('local', '✓ Saved');
      return;
    }
    // Latest snapshot wins. This prevents a pile-up of redundant cloud writes during rendering.
    pendingSave = compactSaveForCloud(save);
    updateSaveIndicator('saving', 'Saving…');
    schedulePendingCloudSave(150);
  }

  async function forceSave(save) {
    clearTimeout(saveTimer);
    if (!save) throw new Error('Open a career before saving.');
    if (!session?.user) {
      updateSaveIndicator('local', '✓ Saved');
      return { localOnly: true };
    }
    if (!pendingSave || String(pendingSave.id) !== String(save.id) || pendingSave.updatedAt !== save.updatedAt) {
      pendingSave = compactSaveForCloud(save);
    }
    updateSaveIndicator('saving', 'Saving…');
    if (saveInFlight) await saveInFlight.catch(() => {});
    const snapshot = pendingSave;
    pendingSave = null;
    try {
      return await saveOne(snapshot);
    } catch (error) {
      pendingSave = pendingSave || snapshot;
      updateSaveIndicator('error', '✓ Saved • retrying automatically');
      scheduleAutomaticRetry();
      throw error;
    }
  }

  async function deleteSave(id) {
    if (!client || !session?.user) throw new Error('You are not signed in.');
    const { error } = await client.from('game_saves').delete()
      .eq('id', id).eq('user_id', session.user.id);
    if (error) throw error;
  }

  async function loadAdminStatus(){if(!client||!session?.user){isAdmin=false;return false;}const {data,error}=await client.from('profiles').select('is_admin').eq('id',session.user.id).maybeSingle();if(error)throw error;isAdmin=Boolean(data?.is_admin);for(const id of ['syncDirectoryBtn','syncRealRostersBtn']){const btn=el(id);if(btn)btn.classList.toggle('hidden',!isAdmin)}return isAdmin;}

  async function ensureProfile(username) {
    const { error } = await client.from('profiles').upsert({
      id: session.user.id,
      username,
      display_name: username
    }, { onConflict: 'id' });
    if (error) throw error;
  }


  async function authRequest(path, body, timeoutMs = 10000) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Supabase's documented password-auth request uses the publishable
          // key in `apikey`. Authorization is added only after a user JWT exists.
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify(body),
        ...(controller ? { signal: controller.signal } : {})
      });
      const raw = await response.text();
      let payload = {};
      try { payload = raw ? JSON.parse(raw) : {}; } catch { payload = { message: raw }; }
      if (!response.ok) {
        const serverMessage = payload.msg || payload.message || payload.error_description || payload.error || '';
        let message = serverMessage || `Supabase Auth returned ${response.status}.`;
        if (response.status === 401 || response.status === 403) {
          message = serverMessage || 'BM27 reached Supabase, but the publishable key was rejected. Check the Project URL and publishable key.';
        } else if (response.status === 429) {
          message = 'Too many sign-in attempts reached Supabase. Wait a moment and try again.';
        }
        const err = new Error(message);
        err.status = response.status;
        err.payload = payload;
        throw err;
      }
      return payload;
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Sign-in server timed out after 10 seconds. Check your internet connection and try again.');
      throw error;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function applyAuthPayload(payload) {
    const accessToken = payload.access_token || payload.session?.access_token;
    const refreshToken = payload.refresh_token || payload.session?.refresh_token;
    if (!accessToken || !refreshToken) {
      throw new Error('Account was created, but email confirmation is enabled. In Supabase, turn off Confirm email under Authentication > Providers > Email.');
    }
    const result = await withTimeout(client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    }), 8000, 'The account signed in, but restoring the session timed out. Try Sign In once more.');
    const { data, error } = result || {};
    if (error) throw error;
    session = data?.session || payload.session || null;
    return session;
  }

  async function signInOneEmail(authClient, email, password) {
    // v2.7.58: use a single, supported Supabase password-auth request.
    // The client stores the session and notifies auth listeners. Calling
    // setSession after another successful password grant adds an unnecessary
    // network request and can make a successful login look like a failure.
    try {
      const result = await withTimeout(
        authClient.auth.signInWithPassword({ email, password }),
        12000,
        'The sign-in request timed out. Check your connection and retry.'
      );
      const { data, error } = result || {};
      if (error) return { data: { session: null, user: null }, error };
      if (!data?.session?.user) {
        return { data: { session: null, user: null }, error: new Error('Sign-in did not return a usable account session. Please retry.') };
      }
      session = data.session;
      return { data, error: null };
    } catch (error) {
      return { data: { session: null, user: null }, error };
    }
  }

  async function verifyDataApiAfterSignIn() {
    if (!client || !session?.user) throw new Error('Sign in before checking cloud data.');
    const { error } = await client.from('profiles').select('id').eq('id', session.user.id).maybeSingle();
    if (error) throw error;
    return true;
  }

  async function syncAccountAfterSignIn(username, { quiet = false } = {}) {
    const tasks = [
      ['profile', () => withTimeout(ensureProfile(username), 8000, 'Profile sync timed out.')],
      ['saves', () => withTimeout(loadCloudSaves(), 12000, 'Career sync timed out.')],
      ['schools', () => withTimeout(loadCloudSchools(), 10000, 'School sync timed out.')],
      ['logos', () => withTimeout(loadBrandingLogos(), 10000, 'Logo sync timed out.')],
      ['admin', () => withTimeout(loadAdminStatus(), 8000, 'Account permissions sync timed out.')]
    ];
    const results = await Promise.all(tasks.map(async ([name, run]) => {
      try { return { name, ok: true, value: await run() }; }
      catch (error) { console.warn(`BM27 ${name} sync skipped`, error); return { name, ok: false, error }; }
    }));
    try { renderLauncher(false); } catch {}
    const saveResult = results.find(x => x.name === 'saves');
    const setupFailure = results.find(x => !x.ok && databaseSetupKind(x.error));
    if (!quiet) {
      if (setupFailure) showStatus(databaseSetupMessage(setupFailure.error), true);
      else if (saveResult?.ok) showStatus('Signed in. Supabase data connected and synced careers loaded.');
      else showStatus('Signed in. Authentication works, but a cloud-data request failed. BM27 will keep your local careers safe and retry.', true);
    }
    return results;
  }

  async function signUp() {
    try {
      setBusy(true);
      const username = normalizedUsername(usernameInput()?.value);
      const password = passwordInput()?.value || '';
      if (username.length < 3) throw new Error('Username must be at least 3 characters.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      showStatus('Creating account…');

      await requireCloudForAccount();
      const payload = await authRequest('signup', {
        email: usernameEmail(username),
        password,
        data: { username, display_name: username }
      }, 8000);
      session = await applyAuthPayload(payload);
      if (!session) throw new Error('Account was created, but BM27 did not receive a usable account session.');
      await ensureProfile(username);
      await loadAdminStatus();
      await loadCloudSaves();
      await loadCloudSchools().catch(() => []);
      updateAccountUI();
      renderLauncher(false);
      showStatus('Account created. Server saves are connected.');
    } catch (error) {
      console.error('Account creation error', error);
      showStatus(`Could not create account: ${errorText(error)}`, true);
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    try {
      setBusy(true);
      const username = normalizedUsername(usernameInput()?.value);
      const password = passwordInput()?.value || '';
      if (!username || !password) throw new Error('Enter your username and password.');
      showStatus('Signing in…');
      const authClient = await withTimeout(requireCloudForAccount(), 6000, 'Cloud setup took too long. Refresh BM27 and try again.');
      let signedSession = null;
      let lastCredentialError = null;

      const candidates = loginEmailCandidates(username);
      for (let i = 0; i < candidates.length; i++) {
        const email = candidates[i];
        let data, error;
        ({ data, error } = await signInOneEmail(authClient, email, password));
        if (!error && data?.session) { signedSession = data.session; break; }
        if (error) {
          const msg = errorText(error, '');
          if ((error?.status === 400 || error?.status === 401 || /invalid login credentials|invalid credentials|invalid_credentials/i.test(msg)) && /invalid login credentials|invalid credentials|invalid_credentials/i.test(msg)) {
            lastCredentialError = error;
            // Legacy account namespaces are tried only after the current namespace rejects the credentials.
            continue;
          }
          throw error;
        }
      }
      if (!signedSession) throw new Error(lastCredentialError ? 'Username or password not recognized. Check both and try again.' : 'Sign-in could not complete. Please retry.');

      // Authentication is the finish line for the button. Do not make the player
      // wait for every table/logo/directory read before showing that sign-in worked.
      session = signedSession;
      updateAccountUI();
      try { renderLauncher(false); } catch {}
      showStatus('Signed in. Checking Supabase data connection…');
      setBusy(false);

      // v2.7.28: Auth and Data API are separate Supabase services. Verify the
      // database immediately so a missing Data API grant is reported as setup,
      // not as a fake network/server outage.
      try {
        await withTimeout(verifyDataApiAfterSignIn(), 7000, 'Supabase Data API check timed out.');
        showStatus('Signed in. Supabase data connected. Loading synced careers…');
      } catch (dbError) {
        if (databaseSetupKind(dbError)) showStatus(databaseSetupMessage(dbError), true);
        else console.warn('BM27 Data API preflight failed', dbError);
      }

      // Continue cloud hydration in the background with individual timeouts.
      void syncAccountAfterSignIn(username).catch(error => {
        console.warn('Post sign-in sync skipped', error);
        showStatus('Signed in. Some cloud data is still syncing; your local careers are safe.', true);
      });
    } catch (error) {
      console.error('Sign-in error', error);
      showStatus(`Could not sign in: ${errorText(error)}`, true);
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    try {
      setBusy(true);
      if (current) await saveOne(current).catch(() => {});
      const { error } = await client.auth.signOut();
      if (error) throw error;
      session = null;
      current = null;
      saves = [];
      try { localStorage.removeItem('mshsaa_bm27_saves'); } catch {}
      el('game')?.classList.add('hidden');
      el('launcher')?.classList.remove('hidden');
      updateAccountUI();
      renderLauncher(false);
    } catch (error) {
      showStatus(`Could not sign out: ${errorText(error)}`, true);
    } finally {
      setBusy(false);
    }
  }

  async function initialize() {
    loadSaves();
    try {
      await withTimeout(recoverPublicConfig(), 3000, 'Cloud configuration recovery timed out.');
      if (!configured) return;
      await withTimeout(ensureCloudClient(), 5000, 'Cloud client startup timed out.');
      const result = await withTimeout(client.auth.getSession(), 6000, 'Restoring the account session timed out.');
      const { data, error } = result || {};
      if (error) throw error;
      session = data?.session || null;

      client.auth.onAuthStateChange((_event, newSession) => {
        session = newSession;
        updateAccountUI();
      });

      // Never hold the launcher hostage while large cloud tables are loading.
      updateAccountUI();
      try { renderLauncher(false); } catch {}
      if (session) {
        const username = session.user?.user_metadata?.username || session.user?.email?.split('@')[0] || 'player';
        showStatus('Signed in. Checking Supabase data connection…');
        void (async()=>{
          try {
            await withTimeout(verifyDataApiAfterSignIn(), 7000, 'Supabase Data API check timed out.');
            showStatus('Signed in. Supabase data connected. Loading synced careers…');
          } catch (dbError) {
            if (databaseSetupKind(dbError)) showStatus(databaseSetupMessage(dbError), true);
            else console.warn('BM27 startup Data API preflight failed', dbError);
          }
          return syncAccountAfterSignIn(username);
        })().catch(error => console.warn('Startup account sync skipped', error));
      }
    } catch (error) {
      console.error('Cloud initialization failed', error);
      showStatus(`Cloud connection error: ${errorText(error)}`, true);
    } finally {
      updateAccountUI();
      try { renderLauncher(false); } catch {}
      readyResolve();
    }
  }

  window.cloudGame = {
    get signedIn() { return Boolean(session?.user); },
    get configured() { return configured; },
    get isAdmin() { return isAdmin; },
    ready,
    refreshSaves: loadCloudSaves,
    loadCloudSchools,
    saveSchoolsToServer,
    loadBrandingLogos,
    saveBrandingLogo,
    deleteBrandingLogo,
    queueCurrentSave,
    saveOne,
    forceSave,
    flushSave: forceSave,
    deleteSave,
    errorText
  };


  window.addEventListener('online', () => {
    if (pendingSave && session?.user) schedulePendingCloudSave(0);
  });

  window.addEventListener('focus', () => {
    if (pendingSave && session?.user) schedulePendingCloudSave(0);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && pendingSave && session?.user) schedulePendingCloudSave(0);
  });

  window.addEventListener('pagehide', () => {
    if (typeof current !== 'undefined' && current) {
      try {
        const compactCurrent = window.BM27FastSave?.compactSave?.(current) || current;
        if (!session?.user) window.BM27Storage?.set('mshsaa_bm27_last_good_save', JSON.stringify(compactCurrent));
        window.BM27Storage?.set('mshsaa_bm27_saves', JSON.stringify((saves || []).map(x => window.BM27FastSave?.compactSave?.(x) || x)));
      } catch {}
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    el('signUpBtn')?.addEventListener('click', signUp);
    el('signInBtn')?.addEventListener('click', signIn);
    ['accountUsername', 'accountPassword'].forEach(id => {
      el(id)?.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !el('signInBtn')?.disabled) { event.preventDefault(); signIn(); }
      });
    });
    el('signOutBtn')?.addEventListener('click', signOut);
    initialize();
  });
})();
