# backend/models/guiche.py
from database import db

class Guiche(db.Model):
    __tablename__ = 'guiches' # Nome da tabela no banco de dados
    id_guiche = db.Column(db.Integer, primary_key=True, autoincrement=True)
    numero = db.Column(db.Integer, unique=True, nullable=False) # Mudado para Integer
    descricao = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f"<Guiche {self.numero}>"

    def to_dict(self):
        return {
            "id_guiche": self.id_guiche,
            "numero": self.numero,
            "descricao": self.descricao
        }
