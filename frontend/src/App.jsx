import React, { useState, useEffect } from 'react';
import { useMediaQuery } from 'react-responsive';
import { LuTicket, LuMonitor, LuUserCircle, LuPhoneCall, LuPause, LuSend, LuCheckCircle, LuWifi, LuWifiOff } from "react-icons/lu";
import { motion, AnimatePresence } from 'framer-motion';
import io from 'socket.io-client';

// Configuração do URL do seu backend no Heroku.
// >>> SUBSTITUA 'SUA_APP_HEROKU_URL_AQUI' PELA URL REAL DO SEU APP NO HEROKU <<<
// Exemplo: const API_BASE_URL = 'https://meu-sistema-fila-prod.herokuapp.com';
const API_BASE_URL = 'SUA_APP_HEROKU_URL_AQUI';

const App = () => {
  // --- Estados da Aplicação ---
  const [view, setView] = useState('totem');
  const [fila, setFila] = useState([]);
  const [senhaAtual, setSenhaAtual] = useState(null);
  const [senhasChamadas, setSenhasChamadas] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Novo estado para controlar o login
  const [localizacao, setLocalizacao] = useState('Guichê 1'); // Novo estado para a localização

  // Hook para otimização em telas menores
  const isSmallScreen = useMediaQuery({ query: '(max-width: 1023px)' });

  // Lista de locais disponíveis para o cliente
  const locaisDisponiveis = ['Guichê 1', 'Guichê 2', 'Guichê 3'];

  // --- Efeito para Configurar a Conexão WebSocket ---
  useEffect(() => {
    // Conecta-se ao servidor Socket.IO
    const socket = io(API_BASE_URL);

    // Listener para o evento de conexão bem-sucedida
    socket.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO!');
      setIsConnected(true);
      setMessage('Conectado ao servidor!');
    });

    // Listener para o evento de desconexão
    socket.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO.');
      setIsConnected(false);
      setMessage('Desconectado. Tentando reconectar...');
    });

    // Listener para o evento de erro de conexão
    socket.on('connect_error', (error) => {
      console.error('Erro de conexão:', error);
      setMessage('Erro de conexão. Verifique o servidor.');
    });

    // Listener para o evento de atualização da fila
    socket.on('fila_atualizada', (data) => {
      console.log('Fila atualizada:', data.fila);
      setFila(data.fila);
    });

    // Listener para o evento de senha chamada
    socket.on('senha_chamada', (data) => {
      console.log('Senha chamada:', data.senha_atual);
      setSenhaAtual(data.senha_atual);
      if (data.senhas_chamadas) {
          setSenhasChamadas(data.senhas_chamadas);
      }
    });

    // Carregar o estado inicial do backend
    fetchEstadoInicial();

    // Função de limpeza para desconectar o socket quando o componente for desmontado
    return () => {
      socket.disconnect();
    };
  }, []);

  // --- Funções de API ---
  const fetchEstadoInicial = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/estado`);
        const data = await response.json();
        setFila(data.fila);
        setSenhaAtual(data.senha_atual);
        setSenhasChamadas(data.senhas_chamadas);
    } catch (error) {
        console.error('Erro ao buscar o estado inicial:', error);
    }
  };

  const gerarSenha = async (servico, prioritaria = false) => {
      if (!isConnected) {
          setMessage('Servidor desconectado. Não é possível gerar senha.');
          return;
      }
      try {
          const response = await fetch(`${API_BASE_URL}/gerar-senha`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ servico, prioritaria, localizacao }),
          });
          const result = await response.json();
          setMessage(result.mensagem);
      } catch (error) {
          console.error('Erro ao gerar senha:', error);
          setMessage('Erro ao gerar senha.');
      }
  };

  const chamarProxima = async () => {
      if (!isConnected) {
          setMessage('Servidor desconectado. Não é possível chamar a próxima senha.');
          return;
      }
      try {
          const response = await fetch(`${API_BASE_URL}/chamar-proxima`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id_guiche: 1, id_atendente: 1 }), // IDs fixos para exemplo
          });
          const result = await response.json();
          setMessage(result.mensagem);
      } catch (error) {
          console.error('Erro ao chamar próxima senha:', error);
          setMessage('Erro ao chamar próxima senha.');
      }
  };

  const finalizarAtendimento = async () => {
      if (!isConnected) {
          setMessage('Servidor desconectado. Não é possível finalizar o atendimento.');
          return;
      }
      try {
          const response = await fetch(`${API_BASE_URL}/finalizar-atendimento`, { method: 'POST' });
          const result = await response.json();
          setMessage(result.mensagem);
      } catch (error) {
          console.error('Erro ao finalizar atendimento:', error);
          setMessage('Erro ao finalizar atendimento.');
      }
  };

  const reencaminharSenha = async () => {
      if (!isConnected) {
          setMessage('Servidor desconectado. Não é possível reencaminhar a senha.');
          return;
      }
      try {
          const response = await fetch(`${API_BASE_URL}/reencaminhar-senha`, { method: 'POST' });
          const result = await response.json();
          setMessage(result.mensagem);
      } catch (error) {
          console.error('Erro ao reencaminhar senha:', error);
          setMessage('Erro ao reencaminhar senha.');
      }
  };

  const handleLogin = () => {
      setIsLoggedIn(true);
      setMessage('Bem-vindo, atendente!');
  };

  // --- Componentes de Visualização (Views) ---

  const TotemView = () => (
      <motion.div
          key="totem"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl space-y-8 animate-fade-in"
      >
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 text-center">Retire sua Senha</h2>
          <div className="flex flex-col space-y-4 w-full max-w-sm">
              <div className="flex flex-col space-y-2">
                  <label htmlFor="local-select" className="text-sm font-semibold text-gray-700 dark:text-gray-300">Escolha o Local:</label>
                  <select
                      id="local-select"
                      value={localizacao}
                      onChange={(e) => setLocalizacao(e.target.value)}
                      className="p-3 border border-gray-300 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                  >
                      {locaisDisponiveis.map((local) => (
                          <option key={local} value={local}>{local}</option>
                      ))}
                  </select>
              </div>
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => gerarSenha('Atendimento Geral')}
                  className="w-full px-8 py-4 text-xl font-bold text-white bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition-colors duration-300"
              >
                  Atendimento Geral
              </motion.button>
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => gerarSenha('Atendimento Prioritário', true)}
                  className="w-full px-8 py-4 text-xl font-bold text-white bg-red-600 rounded-full shadow-lg hover:bg-red-700 transition-colors duration-300"
              >
                  Atendimento Prioritário
              </motion.button>
          </div>
          {message && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 text-lg font-semibold text-green-600 dark:text-green-400">{message}</motion.div>}
      </motion.div>
  );

  const MonitorView = () => (
      <motion.div
          key="monitor"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl space-y-8 animate-fade-in"
      >
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 text-center">Monitor de Atendimento</h2>
          <div className="w-full flex flex-col lg:flex-row space-y-8 lg:space-y-0 lg:space-x-8">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 bg-gray-100 dark:bg-gray-700 p-6 rounded-xl shadow-inner max-h-[50vh] overflow-y-auto">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Últimas Senhas Chamadas</h3>
                  <AnimatePresence>
                      {senhasChamadas.length > 0 ? (
                          senhasChamadas.map((s) => (
                              <motion.div
                                  key={s.senha_completa}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  transition={{ duration: 0.3 }}
                                  className="p-4 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm flex justify-between items-center"
                              >
                                  <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{s.numero_senha}</span>
                                  <span className="text-md text-gray-600 dark:text-gray-400">Guichê {s.guiche} - {s.localizacao}</span>
                              </motion.div>
                          ))
                      ) : (
                          <p className="text-gray-500 dark:text-gray-400">Nenhuma senha chamada ainda.</p>
                      )}
                  </AnimatePresence>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 bg-gray-100 dark:bg-gray-700 p-6 rounded-xl shadow-inner">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Próximas na Fila</h3>
                  <div className="max-h-[30vh] overflow-y-auto">
                      <AnimatePresence>
                          {fila.length > 0 ? (
                              fila.map((s) => (
                                  <motion.div
                                      key={s.numero_senha}
                                      initial={{ opacity: 0, y: -10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: 10 }}
                                      transition={{ duration: 0.3 }}
                                      className="p-4 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm"
                                  >
                                      <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">{s.numero_senha}</span>
                                  </motion.div>
                              ))
                          ) : (
                              <p className="text-gray-500 dark:text-gray-400">Ninguém na fila.</p>
                          )}
                      </AnimatePresence>
                  </div>
              </motion.div>
          </div>
      </motion.div>
  );

  const AtendenteView = () => (
      <motion.div
          key="atendente"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl space-y-8 animate-fade-in w-full max-w-lg mx-auto"
      >
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-gray-100 text-center">Painel do Atendente</h2>
          <div className="w-full flex justify-between items-center p-4 bg-gray-100 dark:bg-gray-700 rounded-xl shadow-inner">
              <span className="text-xl font-bold text-gray-800 dark:text-gray-200">Guichê Atual:</span>
              <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">1</span>
          </div>
          {senhaAtual ? (
              <motion.div
                  key={senhaAtual.numero_senha}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full text-center p-6 bg-blue-500 text-white rounded-xl shadow-lg transform scale-105"
              >
                  <p className="text-2xl font-semibold mb-2">Atendendo:</p>
                  <p className="text-6xl font-black">{senhaAtual.numero_senha}</p>
                  <p className="text-xl mt-2 font-medium">Localização: {senhaAtual.localizacao}</p>
              </motion.div>
          ) : (
              <p className="text-xl font-semibold text-gray-600 dark:text-gray-400">Nenhuma senha em atendimento.</p>
          )}
          <div className="w-full flex flex-col space-y-4">
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={chamarProxima}
                  className="w-full px-8 py-4 text-xl font-bold text-white bg-green-600 rounded-full shadow-lg hover:bg-green-700 transition-colors duration-300"
              >
                  Chamar Próxima
              </motion.button>
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={finalizarAtendimento}
                  className="w-full px-8 py-4 text-xl font-bold text-white bg-red-600 rounded-full shadow-lg hover:bg-red-700 transition-colors duration-300"
              >
                  Finalizar Atendimento
              </motion.button>
              <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={reencaminharSenha}
                  className="w-full px-8 py-4 text-xl font-bold text-white bg-yellow-500 rounded-full shadow-lg hover:bg-yellow-600 transition-colors duration-300"
              >
                  Reencaminhar Senha
              </motion.button>
          </div>
      </motion.div>
  );

  return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans flex flex-col">
          <header className="p-4 bg-white dark:bg-gray-800 shadow-md flex justify-between items-center sticky top-0 z-50">
              <h1 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">Sistema de Senhas</h1>
              <div className="flex items-center space-x-4">
                  {isConnected ? (
                      <LuWifi className="text-green-500 text-2xl" title="Conectado" />
                  ) : (
                      <LuWifiOff className="text-red-500 text-2xl" title="Desconectado" />
                  )}
                  <button
                      onClick={() => setView('totem')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg font-bold transition-colors duration-300 ${
                          view === 'totem'
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                      <LuTicket className="text-xl" />
                      {!isSmallScreen && <span>Totem</span>}
                  </button>
                  <button
                      onClick={() => setView('monitor')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg font-bold transition-colors duration-300 ${
                          view === 'monitor'
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                      <LuMonitor className="text-xl" />
                      {!isSmallScreen && <span>Monitor</span>}
                  </button>
                  <button
                      onClick={() => setView('atendente')}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-full shadow-lg font-bold transition-colors duration-300 ${
                          view === 'atendente'
                              ? 'bg-blue-500 text-white hover:bg-blue-600'
                              : 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
                      }`}
                  >
                      <LuUserCircle className="text-xl" />
                      {!isSmallScreen && <span>Atendente</span>}
                  </button>
              </div>
          </header>

          <main className="flex-1 flex items-center justify-center p-4">
              <AnimatePresence mode="wait">
                  {view === 'totem' && <TotemView key="totem" />}
                  {view === 'monitor' && <MonitorView key="monitor" />}
                  {view === 'atendente' && <AtendenteView key="atendente" />}
              </AnimatePresence>
          </main>
      </div>
  );
};

export default App;
