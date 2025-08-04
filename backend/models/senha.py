# backend/models/senha.py
from database import db
from datetime import datetime

class Senha(db.Model):
    __tablename__ = 'senhas' # Nome da tabela no banco de dados
    id_senha = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_servico = db.Column(db.Integer, db.ForeignKey('servicos.id_servico'), nullable=False)
    numero_sequencial = db.Column(db.Integer, nullable=False)
    prefixo = db.Column(db.String(5), nullable=False)
    senha_completa = db.Column(db.String(20), unique=True, nullable=False)
    data_hora_emissao = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow) # Usar timezone=True
    status = db.Column(db.String(20), nullable=False, default='AGUARDANDO') # AGUARDANDO, CHAMANDO, ATENDIDA, PAUSADA, CANCELADA, REENCAMINHADA
    is_prioritaria = db.Column(db.Boolean, nullable=False, default=False)
    id_guiche_atendimento = db.Column(db.Integer, db.ForeignKey('guiches.id_guiche'), nullable=True)
    id_atendente = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=True)
    data_hora_chamada = db.Column(db.DateTime(timezone=True), nullable=True)
    data_hora_inicio_atendimento = db.Column(db.DateTime(timezone=True), nullable=True)
    data_hora_fim_atendimento = db.Column(db.DateTime(timezone=True), nullable=True)
    observacoes = db.Column(db.Text, nullable=True)
    origem_reencaminhamento = db.Column(db.Integer, db.ForeignKey('guiches.id_guiche'), nullable=True)
    id_senha_anterior = db.Column(db.Integer, db.ForeignKey('senhas.id_senha'), nullable=True)

    # Relacionamentos
    servico = db.relationship('Servico', backref='senhas_associadas')
    guiche_atendimento = db.relationship('Guiche', foreign_keys=[id_guiche_atendimento], backref='senhas_atendidas')
    atendente = db.relationship('Usuario', backref='senhas_atendidas_por_ele')
    guiche_origem = db.relationship('Guiche', foreign_keys=[origem_reencaminhamento], backref='senhas_reencaminhadas_de')
    senha_anterior_obj = db.relationship('Senha', remote_side=[id_senha], backref='senha_seguinte')


    def __repr__(self):
        return f"<Senha {self.senha_completa} - Status: {self.status}>"

    def to_dict(self):
        return {
            "id_senha": self.id_senha,
            "numero_senha": self.senha_completa,
            "id_servico": self.id_servico,
            "id_guiche": self.id_guiche_atendimento,
            "data_geracao": self.data_hora_emissao.isoformat() if self.data_hora_emissao else None,
            "data_chamada": self.data_hora_chamada.isoformat() if self.data_hora_chamada else None,
            "data_inicio_atendimento": self.data_hora_inicio_atendimento.isoformat() if self.data_hora_inicio_atendimento else None,
            "data_fim_atendimento": self.data_hora_fim_atendimento.isoformat() if self.data_hora_fim_atendimento else None,
            "status": self.status,
            "is_prioritaria": self.is_prioritaria,
            "id_atendente": self.id_atendente,
            "observacoes": self.observacoes,
            "origem_reencaminhamento": self.origem_reencaminhamento,
            "id_senha_anterior": self.id_senha_anterior
        }