import dns from "dns";

/**
 * Detects whether the given email address belongs to Google Workspace, Microsoft 365, or neither.
 */
export async function detectEmailProvider(email: string): Promise<'google' | 'microsoft' | 'none'> {
  if (!email || !email.includes('@')) {
    return 'none';
  }

  const domain = email.split('@')[1].toLowerCase().trim();

  // 1. Direct match for common public domains
  const googlePublicDomains = ['gmail.com', 'googlemail.com'];
  const microsoftPublicDomains = [
    'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 
    'passport.com', 'passport.net', 'windowslive.com'
  ];

  if (googlePublicDomains.includes(domain)) {
    return 'google';
  }
  if (microsoftPublicDomains.includes(domain)) {
    return 'microsoft';
  }

  // 2. Perform MX Record Lookup
  try {
    const records = await dns.promises.resolveMx(domain);
    const exchangeNames = records.map(r => r.exchange.toLowerCase());
    
    const isGoogle = exchangeNames.some(name => 
      name.includes("google.com") || name.includes("googlemail.com")
    );
    const isMicrosoft = exchangeNames.some(name => 
      name.includes("outlook.com") || name.includes("protection.outlook.com")
    );

    if (isGoogle) return 'google';
    if (isMicrosoft) return 'microsoft';
  } catch (err) {
    console.warn(`MX lookup failed for domain: ${domain}, trying fallback...`);
  }

  // 3. Fallback: Query Microsoft User Realm Endpoint
  try {
    const url = `https://login.microsoftonline.com/common/userrealm/${encodeURIComponent(email)}?api-version=2.1`;
    const response = await fetch(url);
    if (response.ok) {
      const data: any = await response.json();
      if (data.NameSpaceType === 'Managed' || data.NameSpaceType === 'Federated') {
        return 'microsoft';
      }
    }
  } catch (err) {
    console.error(`Microsoft User Realm lookup failed for: ${email}`, err);
  }

  return 'none';
}
