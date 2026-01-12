
export const StorageService = {
    KEYS: {
        API_KEY: 'ghibli_coloring_api_key',
        THEME: 'ghibli_coloring_theme'
    },

    get(key) {
        return localStorage.getItem(key);
    },

    set(key, value) {
        localStorage.setItem(key, value);
    },

    remove(key) {
        localStorage.removeItem(key);
    },

    hasApiKey() {
        return !!this.get(this.KEYS.API_KEY);
    }
};
