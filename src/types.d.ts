type str = string;
type obj = object;
type num = number;
type bool = boolean;

type ConfigStore = { [key: str]: null | obj | str | numb | bool };
type ListenerFunction = (newConfig: ConfigStore) => void;
type ParserFunction = (input: str) => ConfigStore;

type InternalPlugin = (value: str, currentKeyName: str, parent: ConfigStore) => str | ConfigStore;
