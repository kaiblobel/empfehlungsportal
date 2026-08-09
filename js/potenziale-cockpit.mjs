/** Reine Helfer für die sichere Cockpit-Verbindung. */

export const COCKPIT_BASE_URL = 'https://www.beratercockpit.de';

export function cockpitStatusLabel(value) {
  return ({
    interessent: 'Interessent',
    kunde: 'Kunde',
    altkunde: 'Altkunde',
    verstorben: 'Verstorben',
  })[String(value || '')] || 'Unbekannt';
}

export function cockpitLinkMap(payload) {
  const map = new Map();
  if (!payload?.ok || !Array.isArray(payload.links)) return map;
  payload.links.forEach((link) => {
    if (!link?.potentialId || !link?.clientId || !link?.clientPath) return;
    map.set(link.potentialId, {
      ...link,
      relationshipLabel: link.relationshipLabel || cockpitStatusLabel(link.relationshipStage),
    });
  });
  return map;
}

export function cockpitAccessState(payload) {
  if (!payload?.ok) return 'unavailable';
  if (payload.access === 'available') return 'available';
  if (payload.access === 'locked') return 'locked';
  return 'unavailable';
}

export function cockpitClientUrl(link) {
  const path = String(link?.clientPath || '');
  return /^\/clients\/[0-9a-f-]{36}$/i.test(path) ? `${COCKPIT_BASE_URL}${path}` : COCKPIT_BASE_URL;
}

export async function cockpitRequest(fetchImpl, accessToken, payload) {
  if (!accessToken) return { ok: false, status: 401, reason: 'login_required' };
  try {
    const response = await fetchImpl('/api/cockpit-potenzial', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    let result = null;
    try { result = await response.json(); } catch (_) {}
    return { ...(result || { ok: false, reason: 'invalid_response' }), status: response.status };
  } catch (_) {
    return { ok: false, status: 502, reason: 'cockpit_unreachable' };
  }
}

export function cockpitFehlertext(reason) {
  return ({
    login_required: 'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.',
    invalid_login: 'Deine Anmeldung konnte nicht bestätigt werden. Bitte melde dich erneut an.',
    advisor_mapping_missing: 'Für dein Portal-Konto fehlt die eindeutige Cockpit-Zuordnung. Es wurde nichts verbunden.',
    cockpit_access_pending: 'Deine Cockpit-Verbindung ist noch nicht freigeschaltet. Es wurde nichts verbunden.',
    access_check_unavailable: 'Die Cockpit-Freigabe konnte gerade nicht geprüft werden. Es wurde nichts verbunden.',
    migration_required: 'Die Verbindung ist im Code vorbereitet. Die Cockpit-Datenbank wurde noch nicht freigegeben.',
    partner_uses_partner_record: 'Potenzialpartner gehören in die Partnerakte. Diese Verbindung ist nur für Interessenten und Kunden.',
    full_name_required: 'Bitte ergänze Vor- und Nachnamen, bevor du eine neue Interessentenakte anlegst.',
    client_not_in_advisor_scope: 'Diese Akte gehört nicht zu deinem Beraterbereich. Es wurde nichts verbunden.',
    client_already_linked: 'Diese Kundenakte ist bereits mit einem anderen Potenzial verbunden.',
    matching_client_exists: 'Im Cockpit gibt es bereits eine passende Person. Prüfe sie bitte zuerst.',
    rate_limited: 'Bitte warte kurz und versuche es dann erneut.',
    bridge_not_configured: 'Die lokale Cockpit-Verbindung ist noch nicht eingerichtet. Es wurde nichts verändert.',
    invalid_response: 'Das Cockpit hat keine gültige Antwort geliefert. Es wurde nichts verändert.',
    invalid_cockpit_response: 'Das Cockpit hat keine gültige Antwort geliefert. Es wurde nichts verändert.',
    cockpit_unreachable: 'Das Berater-Cockpit ist gerade nicht erreichbar. Im Potenzialbuch wurde nichts verändert.',
  })[String(reason || '')] || 'Die Verbindung konnte gerade nicht hergestellt werden. Es wurde nichts verändert.';
}
