// Создаем mock-клиент для случаев, когда Redis отключен
const mockClient = {
  isOpen: false,
  isReady: false,
  get: async () => null,
  setEx: async () => {},
  keys: async () => [],
  del: async () => {},
  on: () => mockClient,
  connect: async () => {},
  disconnect: async () => {},
  quit: async () => {}
};

// Redis полностью отключен - используем mock
console.log('⚠️  Redis disabled, caching disabled');
module.exports = mockClient;