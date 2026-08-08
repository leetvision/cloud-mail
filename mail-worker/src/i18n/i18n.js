import { AsyncLocalStorage } from 'node:async_hooks';
import i18next from 'i18next';
import en from './en.js';
import app from '../hono/hono';

const languageStorage = new AsyncLocalStorage();

i18next.init({
	fallbackLng: 'en',
	resources: {
		en: { translation: en },
	},
});

const translators = {
	en: i18next.getFixedT('en'),
};

app.use('*', (c, next) => {
	return languageStorage.run('en', next);
});

export const t = (key, values) => translators[languageStorage.getStore() || 'en'](key, values);

export default i18next;
