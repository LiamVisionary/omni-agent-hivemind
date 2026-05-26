type ClassValue = string | false | null | undefined;

export function cssClass(styles: Record<string, string>, ...names: ClassValue[]) {
  return names
    .filter((name): name is string => Boolean(name))
    .map((name) => styles[name] ?? name)
    .join(" ");
}

export function createStyleClass(styles: Record<string, string>) {
  return (...names: ClassValue[]) => cssClass(styles, ...names);
}
