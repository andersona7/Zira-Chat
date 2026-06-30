import { RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { router } from './routes';
import { SocketProvider } from './hooks/useSocket';
import { ThemeProvider } from './components/theme/ThemeProvider';
import { AuthBootstrap } from './components/AuthBootstrap';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthBootstrap>
          <ThemeProvider>
            <SocketProvider>
              <RouterProvider router={router} />
            </SocketProvider>
          </ThemeProvider>
        </AuthBootstrap>
      </PersistGate>
    </Provider>
  );
}
