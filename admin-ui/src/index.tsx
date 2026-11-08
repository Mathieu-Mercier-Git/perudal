import React from 'react';
import { createRoot } from 'react-dom/client';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import 'react-toastify/dist/ReactToastify.css';
import 'micro-observables/batchingForReactDom';
import { Logger } from 'simple-logging-system';
import { configureGlobalInjector, Injector } from 'plume-ts-di';
import './polyfill-loader';
import installServicesModule from './services/services-module';
import installComponentsModule from './components/components-module';
import App from './components/App';
import installApiModule from './api/api-module';
import SessionService from './services/session/SessionService';
import installI18nModule from './i18n/i18n-module';
import installPlumeAdminUsersModule from './lib/plume-admin-users/plume-admin-users-module';
import initializeLocalizedDate from './i18n/messages/LocalizedDate';
import LocaleService from './i18n/locale/LocaleService';
import NotificationRenderer from './components/theme/NotificationRenderer';
import UserService from './services/user/UserService';
import installViewportScrollReset from './utils/ViewportScrollReset';

const currentMillis: number = Date.now();
const logger: Logger = new Logger('index');

const injector: Injector = new Injector();
installServicesModule(injector);
installComponentsModule(injector);
installApiModule(injector);
installI18nModule(injector);
installPlumeAdminUsersModule(injector);

injector.initializeSingletonInstances();

configureGlobalInjector(injector);

const sessionService: SessionService = injector.getInstance(SessionService);
sessionService.tryInitializingSessionFromStorage();
sessionService.synchronizeSessionFromOtherBrowserTags();

const userService: UserService = injector.getInstance(UserService);
userService.initializingUserFromStorage()

// dayjs
initializeLocalizedDate(injector.getInstance(LocaleService));
// notifications display management
injector.getInstance(NotificationRenderer).initialize();

// iOS : remet la page en place après la fermeture du clavier
installViewportScrollReset();

const reactApp: JSX.Element = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
const rootElement: HTMLElement | null = document.getElementById('root');
if (!rootElement) {
  throw new Error('Failed to find the root element');
}
createRoot(rootElement).render(reactApp);

// PWA : le service worker rend l'application installable sur téléphone (pas en local,
// pour ne pas interférer avec le rechargement à chaud de Vite en développement)
if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((error: unknown) => logger.warn('Service worker non enregistré', error));
  });
}

logger.info(`Application started in ${Date.now() - currentMillis}ms`);
