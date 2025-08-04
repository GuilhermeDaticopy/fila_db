# app.py

# ================================================================
# IMPORTS NECESSÁRIOS
# ================================================================
from flask import Flask, jsonify, request, send_from_directory
from flask_socketio import SocketIO, emit
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from dotenv import load_dotenv
from datetime import datetime
import os
import gevent
from gevent import monkey
monkey.patch_all()

# ================================================================
# CONFIGURAÇÃO DO BANCO DE DADOS E EXTENSÕES (NÍVEL GLOBAL)
# ================================================================
# Carrega as variáveis de ambiente do .env para ambiente local
load_dotenv()

# Instancia o aplicativo Flask, definindo a pasta de arquivos estáticos.
# Esta pasta ('../frontend/dist') conterá o frontend React após o 'build'.
app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')

# Configuração do banco de dados PostgreSQL
# CORREÇÃO CRÍTICA: Substitui "postgres://" por "postgresql+psycopg2://" para compatibilidade com SQLAlchemy no Heroku.
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL').replace("postgres://", "postgresql+psycopg2://", 1) if os.getenv('DATABASE_URL') else (
    f"postgresql+psycopg2://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_DATABASE')}"
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Inicialização das extensões com o app
db = SQLAlchemy(app)
# CORS não é necessário quando o Flask serve o frontend do mesmo domínio.
socketio = SocketIO(app)

# ================================================================
# MODELOS DO BANCO DE DADOS
# (Estes modelos estão incluídos diretamente aqui para garantir que o Heroku os encontre)
# ================================================================

class Servico(db.Model):
    __tablename__ = 'servicos'
    id_servico = db.Column(db.Integer, primary_key=True)
    nome_servico = db.Column(db.String(100), nullable=False, unique=True)
    prefixo_senha = db.Column(db.String(5), nullable=False)

    def __repr__(self):
        return f'<Servico {self.nome_servico}>'

class Senha(db.Model):
    __tablename__ = 'senhas'
    id_senha = db.Column(db.Integer, primary_key=True)
    id_servico = db.Column(db.Integer, db.ForeignKey('servicos.id_servico'), nullable=False)
    numero_sequencial = db.Column(db.Integer, nullable=False)
    prefixo = db.Column(db.String(5), nullable=False)
    senha_completa = db.Column(db.String(20), nullable=False, unique=True)
    status = db.Column(db.String(50), nullable=False, default='AGUARDANDO')
    is_prioritaria = db.Column(db.Boolean, nullable=False, default=False)
    data_hora_emissao = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    data_hora_chamada = db.Column(db.DateTime)
    data_hora_fim_atendimento = db.Column(db.DateTime)
    id_guiche_atendimento = db.Column(db.Integer)
    id_atendente = db.Column(db.Integer)
    localizacao = db.Column(db.String(255))

    servico = db.relationship('Servico', backref=db.backref('senhas', lazy=True))

    def to_dict(self):
        return {
            'id_senha': self.id_senha,
            'numero_senha': self.senha_completa,
            'servico': self.servico.nome_servico,
            'is_prioritaria': self.is_prioritaria,
            'status': self.status,
            'data_hora_emissao': self.data_hora_emissao.isoformat() if self.data_hora_emissao else None,
            'data_hora_chamada': self.data_hora_chamada.isoformat() if self.data_hora_chamada else None,
            'guiche': self.id_guiche_atendimento,
            'localizacao': self.localizacao
        }

class Guiche(db.Model):
    __tablename__ = 'guiches'
    id_guiche = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.String(255))
    is_disponivel = db.Column(db.Boolean, nullable=False, default=True)

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id_usuario = db.Column(db.Integer, primary_key=True)
    nome_completo = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False, unique=True)
    senha = db.Column(db.String(255), nullable=False)
    is_atendente = db.Column(db.Boolean, nullable=False, default=True)

# ================================================================
# ROTAS DO PROJETO - LÓGICA DO BACKEND
# ================================================================
@app.route('/estado', methods=['GET'])
def get_estado():
    try:
        fila_senhas_db = Senha.query.filter_by(status='AGUARDANDO').order_by(Senha.data_hora_emissao).all()
        senhas_chamadas_db = Senha.query.filter(Senha.status.in_(['CHAMANDO', 'ATENDIDA'])).order_by(Senha.data_hora_chamada.desc()).limit(5).all()
        senha_atual_db = Senha.query.filter_by(status='CHAMANDO').first()

        return jsonify({
            'fila': [s.to_dict() for s in fila_senhas_db],
            'senha_atual': senha_atual_db.to_dict() if senha_atual_db else None,
            'senhas_chamadas': [s.to_dict() for s in senhas_chamadas_db]
        })
    except Exception as e:
        return jsonify({'erro': f'Erro ao buscar o estado inicial: {str(e)}'}), 500

@app.route('/gerar-senha', methods=['POST'])
def gerar_senha_db():
    try:
        data = request.json
        servico_nome = data.get('servico')
        is_prioritaria = data.get('prioritaria', False)
        localizacao = data.get('localizacao', 'Não especificado')

        if not servico_nome:
            return jsonify({'erro': 'Serviço não especificado'}), 400

        servico = Servico.query.filter_by(nome_servico=servico_nome).first()
        if not servico:
            # Caso o serviço não exista, crie um no banco de dados para evitar erros.
            servico = Servico(nome_servico=servico_nome, prefixo_senha=servico_nome[:1].upper())
            db.session.add(servico)
            db.session.commit()
            print(f"Serviço '{servico_nome}' não encontrado, mas foi criado.")

        ultimo_sequencial = db.session.query(func.max(Senha.numero_sequencial)).filter_by(id_servico=servico.id_servico).scalar()
        proximo_sequencial = 1 if ultimo_sequencial is None else ultimo_sequencial + 1

        prefixo = servico.prefixo_senha
        numero_senha_completa = f'{prefixo}-{proximo_sequencial:03d}'
        
        nova_senha = Senha(
            id_servico=servico.id_servico,
            numero_sequencial=proximo_sequencial,
            prefixo=prefixo,
            senha_completa=numero_senha_completa,
            is_prioritaria=is_prioritaria,
            data_hora_emissao=datetime.utcnow(),
            localizacao=localizacao
        )
        db.session.add(nova_senha)
        db.session.commit()

        fila_senhas_db = Senha.query.filter_by(status='AGUARDANDO').order_by(Senha.data_hora_emissao).all()
        socketio.emit('fila_atualizada', {'fila': [s.to_dict() for s in fila_senhas_db]})

        return jsonify({'mensagem': 'Senha gerada com sucesso', 'numero': numero_senha_completa}), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Ocorreu um erro ao gerar a senha: {str(e)}'}), 500

@app.route('/chamar-proxima', methods=['POST'])
def chamar_proxima_db():
    try:
        # Pega a próxima senha, dando prioridade a senhas prioritárias
        senha_a_chamar = Senha.query.filter_by(status='AGUARDANDO').order_by(Senha.is_prioritaria.desc(), Senha.data_hora_emissao).first()

        if senha_a_chamar:
            # Finaliza qualquer atendimento que estava em andamento
            senha_anterior = Senha.query.filter_by(status='CHAMANDO').first()
            if senha_anterior:
                senha_anterior.status = 'ATENDIDA'
                senha_anterior.data_hora_fim_atendimento = datetime.utcnow()
            
            senha_a_chamar.status = 'CHAMANDO'
            senha_a_chamar.id_guiche_atendimento = 1 # ID do guichê fixo para exemplo
            senha_a_chamar.id_atendente = 1 # ID do atendente fixo para exemplo
            senha_a_chamar.data_hora_chamada = datetime.utcnow()
            db.session.commit()
            
            fila_senhas_db = Senha.query.filter_by(status='AGUARDANDO').order_by(Senha.data_hora_emissao).all()
            senhas_chamadas_db = Senha.query.filter(Senha.status.in_(['CHAMANDO', 'ATENDIDA'])).order_by(Senha.data_hora_chamada.desc()).limit(5).all()

            socketio.emit('senha_chamada', {'senha_atual': senha_a_chamar.to_dict(), 'senhas_chamadas': [s.to_dict() for s in senhas_chamadas_db]})
            socketio.emit('fila_atualizada', {'fila': [s.to_dict() for s in fila_senhas_db]})

            return jsonify({'mensagem': 'Próxima senha chamada', 'senha': senha_a_chamar.to_dict()})
        else:
            return jsonify({'mensagem': 'A fila está vazia'}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Ocorreu um erro ao chamar a próxima senha: {str(e)}'}), 500

# Rota para finalizar um atendimento
@app.route('/finalizar-atendimento', methods=['POST'])
def finalizar_atendimento_db():
    try:
        senha_atual_db = Senha.query.filter_by(status='CHAMANDO').first()
        if senha_atual_db:
            senha_atual_db.status = 'ATENDIDA'
            senha_atual_db.data_hora_fim_atendimento = datetime.utcnow()
            db.session.commit()

            fila_senhas_db = Senha.query.filter_by(status='AGUARDANDO').order_by(Senha.data_hora_emissao).all()
            senhas_chamadas_db = Senha.query.filter(Senha.status.in_(['ATENDIDA'])).order_by(Senha.data_hora_chamada.desc()).limit(5).all()
            
            # Emitir para os clientes a fila e senhas atualizadas
            socketio.emit('senha_chamada', {'senha_atual': None, 'senhas_chamadas': [s.to_dict() for s in senhas_chamadas_db]})
            socketio.emit('fila_atualizada', {'fila': [s.to_dict() for s in fila_senhas_db]})

            return jsonify({'mensagem': 'Atendimento finalizado com sucesso'})
        else:
            return jsonify({'mensagem': 'Nenhuma senha em atendimento'}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Ocorreu um erro ao finalizar o atendimento: {str(e)}'}), 500

# Rota para reencaminhar uma senha para o final da fila
@app.route('/reencaminhar-senha', methods=['POST'])
def reencaminhar_senha_db():
    try:
        senha_atual_db = Senha.query.filter_by(status='CHAMANDO').first()
        if senha_atual_db:
            senha_atual_db.status = 'AGUARDANDO'
            senha_atual_db.data_hora_chamada = None # Resetamos a data de chamada para reentrar na fila
            senha_atual_db.id_guiche_atendimento = None
            senha_atual_db.id_atendente = None
            db.session.commit()
            
            fila_senhas_db = Senha.query.filter_by(status='AGUARDANDO').order_by(Senha.data_hora_emissao).all()
            senhas_chamadas_db = Senha.query.filter(Senha.status.in_(['CHAMANDO', 'ATENDIDA'])).order_by(Senha.data_hora_chamada.desc()).limit(5).all()
            
            socketio.emit('senha_chamada', {'senha_atual': None, 'senhas_chamadas': [s.to_dict() for s in senhas_chamadas_db]})
            socketio.emit('fila_atualizada', {'fila': [s.to_dict() for s in fila_senhas_db]})
            
            return jsonify({'mensagem': 'Senha reencaminhada para o final da fila'})
        else:
            return jsonify({'mensagem': 'Nenhuma senha em atendimento'}), 404
    except Exception as e:
        db.session.rollback()
        return jsonify({'erro': f'Ocorreu um erro ao reencaminhar a senha: {str(e)}'}), 500


# ================================================================
# ROTA PARA SERVIR O FRONTEND
# ================================================================
# Esta rota serve qualquer arquivo que não seja uma rota da API.
# Ela é essencial para que o Flask direcione o tráfego do React.
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    # Se o caminho for vazio ou não existir, serve o index.html do frontend
    if path == "" or not os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, 'index.html')
    # Senão, serve o arquivo estático solicitado (ex: CSS, JS, imagens)
    return send_from_directory(app.static_folder, path)


# ================================================================
# EXECUÇÃO DA APLICAÇÃO
# ================================================================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()

        if not Servico.query.first():
            servico1 = Servico(nome_servico='Atendimento Geral', prefixo_senha='A')
            servico2 = Servico(nome_servico='Atendimento Prioritário', prefixo_senha='P')
            db.session.add(servico1)
            db.session.add(servico2)
            db.session.commit()
            print("Serviços iniciais adicionados ao banco de dados.")

        if not Guiche.query.first():
            guiche1 = Guiche(nome='Guichê 1', descricao='Guichê de Atendimento Principal')
            guiche2 = Guiche(nome='Guichê 2', descricao='Guichê de Atendimento Prioritário')
            db.session.add(guiche1)
            db.session.add(guiche2)
            db.session.commit()
            print("Guichês iniciais adicionados ao banco de dados.")

    # Inicia o servidor Socket.IO
    # No Heroku, o Gunicorn vai gerenciar a porta, então não precisamos especificar aqui.
    # Para teste local, pode usar: socketio.run(app, debug=True, host='0.0.0.0', port=5000)
    socketio.run(app, debug=True, host='0.0.0.0', port=os.environ.get('PORT', 5000))
