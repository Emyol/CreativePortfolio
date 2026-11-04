/** One step out per press: the newest open device gets the first go; when none takes it, the desk ejects. */
type BackHandler = () => boolean;

let handlers: BackHandler[] = [];

export function pushBack(handler: BackHandler): () => void {
  handlers.push(handler);
  return () => {
    handlers = handlers.filter((h) => h !== handler);
  };
}

export function runBack(): boolean {
  for (const handler of [...handlers].reverse()) {
    if (handler()) return true;
  }
  return false;
}

export function __resetBackForTests(): void {
  handlers = [];
}
