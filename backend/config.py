# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv() # Carrega as variáveis do arquivo .env

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'uma_chave_secreta_padrao_muito_segura') # Chave secreta para segurança do Flask
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_DATABASE')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False # Desativa o rastreamento de modificações do SQLAlchemy (melhora performance)
    # Configurações para Flask-SocketIO
    SOCKETIO_MESSAGE_QUEUE = os.getenv('SOCKETIO_MESSAGE_QUEUE', None) # Pode ser usado para escalar o SocketIO com Redis
    CORS_HEADERS = 'Content-Type' # Cabeçalhos CORS permitidos
    PORT = os.getenv('PORT', 5000)