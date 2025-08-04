// backend/src/config/database.js
require('dotenv').config(); // Garante que as variáveis de ambiente sejam carregadas

module.exports = {
    dialect: 'postgres', // Tipo de banco de dados
    host: process.env.DB_HOST, // Host do banco de dados (geralmente localhost)
    port: process.env.DB_PORT, // Porta do banco de dados (geralmente 5432)
    username: process.env.DB_USER, // Nome de usuário do banco de dados (postgres)
    password: process.env.DB_PASSWORD, // Senha do usuário do banco de dados
    database: process.env.DB_DATABASE, // Nome do banco de dados (fila_db)
    define: {
        timestamps: true, // Adiciona campos createdAt e updatedAt automaticamente
        underscored: true, // Usa snake_case para nomes de colunas no banco de dados
        underscoredAll: true // Aplica a todas as colunas
    },
    logging: false, // Define para 'console.log' para ver as queries SQL no console, ou false para desativar
    dialectOptions: {
        ssl: {
            require: false, // Defina para true se estiver usando SSL (HTTPS) no seu PostgreSQL. Para local, false é comum.
            rejectUnauthorized: false // Ignora validação de certificado para desenvolvimento local
        }
    }
};