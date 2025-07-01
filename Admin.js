export function validateCredentials(username, password) {
  const credentials = [
    { username: 'Shyaam', password: 'Jalaram', redirect: 'main.html' },
    { username: 'Dinesh', password: 'Jalaram@205', redirect: 'main1.html' }
  ];
  const match = credentials.find(cred => cred.username === username && cred.password === password);
  return match ? { valid: true, redirect: match.redirect } : { valid: false };
}