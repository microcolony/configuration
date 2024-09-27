type KeyValueStore = { [key: string]: KeyValueStore | string };
type ConfigStore = {
  [key: string]: KeyValueStore;
};
type ListenerFunction = (newConfig: ConfigStore) => void;
type ParserFunction = (input: string) => KeyValueStore;

type ParserPlugin = (
  value: string,
  currentKeyName: string,
  parent: KeyValueStore,
) => string | KeyValueStore;
