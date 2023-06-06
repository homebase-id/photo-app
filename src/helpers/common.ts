export const convertTextToSlug = (text: string) => {
  return text
    .replaceAll(/[^a-z0-9 ]/gi, '')
    .trim()
    .split(' ')
    .join('-')
    .toLowerCase();
};

export const stringify = (obj: unknown) => {
  return Object.keys(obj as any)
    .map((key) => key + '=' + (obj as any)[key])
    .join('&');
};

export const getVersion = () => {
  try {
    const numberedVersion = parseInt(import.meta.env.VITE_VERSION ?? '');
    if (isNaN(numberedVersion)) {
      return import.meta.env.VITE_VERSION;
    }

    const t = new Date(1970, 0, 1); // Epoch
    t.setSeconds(numberedVersion);
    return `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`;
  } catch (ex) {
    console.error(ex);
    return import.meta.env.VITE_VERSION;
  }
};
