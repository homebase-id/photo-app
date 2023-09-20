const enLocale = [
  ['login', 'Login'],
  ['logout', 'Logout'],
  ['signup', 'Signup'],
] as const;

const internalDict: Map<string, string> = new Map(enLocale);

const t = (key: string) => {
  return internalDict.get(key.toLowerCase()) ?? key;
};

export { t };
