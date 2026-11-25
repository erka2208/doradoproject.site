export const privacyStyle = '<link rel="stylesheet" href="/site-privacy.css">';
export const privacyScript = '<script src="/site-metrics.js" defer></script>';
export function privacyFooter(lang = 'en') {
  return lang === 'nl'
    ? '<p class="privacy-note"><strong>Geen trackingkoekjes hier. Gewoon muziek, zonder bullshit.</strong><br>We tellen paginaweergaven per land en regio zonder IP-adressen te bewaren. Spotify en andere externe diensten hebben hun eigen cookie-instellingen.</p>'
    : '<p class="privacy-note"><strong>No tracking cookies. Just music, no bullshit.</strong><br>We count page views by country and region without storing IP addresses. Spotify and other external services have their own cookie settings.</p>';
}
