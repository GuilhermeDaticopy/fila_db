# backend/models/usuario.py
from database import db
from flask_bcrypt import generate_password_hash, check_password_hash

class Usuario(db.Model):
    __tablename__ = 'usuarios' # Nome da tabela no banco de dados
    id_usuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), nullable=False) # Nome completo do usuário
    login = db.Column(db.String(50), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False) # Armazenará o hash da senha
    tipo = db.Column(db.String(20), nullable=False) # 'ATENDENTE', 'ADMINISTRADOR'
    ativo = db.Column(db.Boolean, nullable=False, default=True)
    id_guiche_atual = db.Column(db.Integer, db.ForeignKey('guiches.id_guiche'), nullable=True) # Guichê em que o atendente está logado

    # Relacionamento (opcional, mas útil)
    guiche_associado = db.relationship('Guiche', backref='atendentes_logados')

    def __repr__(self):
        return f"<Usuario {self.login} ({self.tipo})>"

    def set_password(self, password):
        # Gera o hash da senha antes de salvar
        self.senha_hash = generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        # Verifica se a senha fornecida corresponde ao hash
        return check_password_hash(self.senha_hash, password)

    def to_dict(self):
        return {
            "id_usuario": self.id_usuario,
            "nome": self.nome,
            "login": self.login,
            "tipo": self.tipo,
            "ativo": self.ativo,
            "id_guiche_atual": self.id_guiche_atual
        }
