# backend/models/servico.py
from database import db

class Servico(db.Model):
    __tablename__ = 'servicos' # Nome da tabela no banco de dados
    id_servico = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nome = db.Column(db.String(100), unique=True, nullable=False)
    prefixo_senha = db.Column(db.String(5), unique=True, nullable=False)
    ativo = db.Column(db.Boolean, nullable=False, default=True)

    def __repr__(self):
        return f"<Servico {self.nome}>"

    def to_dict(self):
        return {
            "id_servico": self.id_servico,
            "nome": self.nome,
            "prefixo_senha": self.prefixo_senha,
            "ativo": self.ativo
        }