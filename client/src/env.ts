export const STDB_ENV = import.meta.env.VITE_STDB_ENV || 'local';
export const IS_DEV = STDB_ENV !== 'cloud';
