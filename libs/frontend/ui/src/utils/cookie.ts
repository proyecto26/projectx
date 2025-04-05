export function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

export function saveCookie(cookieName: string, value: unknown) {
  document.cookie = `${cookieName}=${value};path=/;max-age=31536000`;
}
