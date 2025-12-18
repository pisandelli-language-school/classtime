export const useLoader = () => {
  const isLoading = useState('global-loader-loading', () => false);
  const loadingMessage = useState(
    'global-loader-message',
    () => 'Carregando...'
  );

  const startLoading = (message = 'Carregando...') => {
    loadingMessage.value = message;
    isLoading.value = true;
  };

  const stopLoading = () => {
    isLoading.value = false;
  };

  return {
    isLoading,
    loadingMessage,
    startLoading,
    stopLoading,
  };
};
