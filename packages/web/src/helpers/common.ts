export const getVersion = () => {
  try {
    const numberedVersion = parseInt(import.meta.env.VITE_VERSION ?? '');
    if (isNaN(numberedVersion)) {
      return import.meta.env.VITE_VERSION;
    }

    const t = new Date(0); // Epoch
    t.setSeconds(numberedVersion);
    return `${t.toLocaleDateString()} ${t.toLocaleTimeString()}`;
  } catch (ex) {
    console.error(ex);
    return import.meta.env.VITE_VERSION;
  }
};
